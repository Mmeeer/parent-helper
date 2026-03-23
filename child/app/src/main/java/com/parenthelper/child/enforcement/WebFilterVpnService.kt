package com.parenthelper.child.enforcement

import android.app.Notification
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import com.parenthelper.child.ParentHelperApp
import com.parenthelper.child.R
import com.parenthelper.child.collectors.WebActivityCollector
import com.parenthelper.child.ui.main.MainActivity
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.nio.ByteBuffer

/**
 * Local VPN service that intercepts DNS traffic to block filtered domains.
 * Routes DNS requests through a local TUN interface, inspects domain names,
 * and returns NXDOMAIN for blocked domains.
 */
class WebFilterVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private val serviceScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val outputMutex = Mutex()
    @Volatile
    private var isRunning = false

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }

        startVpn()
        return START_STICKY
    }

    private fun startVpn() {
        if (isRunning) return
        isRunning = true

        try {
            val builder = Builder()
                .setSession("ParentHelper WebFilter")
                .addAddress(VPN_ADDRESS, 24)
                .addRoute(REAL_DNS, 32)     // Route traffic to real DNS through VPN
                .addDnsServer(REAL_DNS)      // Tell system to use real DNS (traffic will pass through TUN)
                .setMtu(MTU_SIZE)
                .setBlocking(true)

            // Exclude our own app from the VPN to prevent loops
            try { builder.addDisallowedApplication(packageName) } catch (_: Exception) {}

            vpnInterface = builder.establish() ?: run {
                Log.e(TAG, "VPN interface establish() returned null")
                isRunning = false
                return
            }
            Log.i(TAG, "VPN tunnel established")
            startForeground(NOTIFICATION_ID, createVpnNotification())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to establish VPN", e)
            isRunning = false
            return
        }

        Log.d(TAG, "VPN started")

        serviceScope.launch {
            runVpnLoop()
        }
    }

    private suspend fun runVpnLoop() {
        val vpnFd = vpnInterface ?: return
        val input = FileInputStream(vpnFd.fileDescriptor)
        val output = FileOutputStream(vpnFd.fileDescriptor)
        val packet = ByteBuffer.allocate(MTU_SIZE)

        while (isRunning) {
            try {
                packet.clear()
                val length = input.read(packet.array())
                if (length <= 0) {
                    delay(10)
                    continue
                }
                packet.limit(length)

                // Check if this is a DNS request (UDP to port 53)
                if (isDnsRequest(packet.array(), length)) {
                    val domain = extractDomainFromDns(packet.array(), length)
                    if (domain != null && shouldBlockDomain(domain)) {
                        Log.d(TAG, "Blocking domain: $domain")
                        BlockedAttemptLogger.logBlocked(domain)
                        WebActivityCollector.recordBlocked(domain)
                        val response = buildNxDomainResponse(packet.array(), length)
                        if (response != null) {
                            outputMutex.withLock {
                                output.write(response)
                                output.flush()
                            }
                            continue
                        }
                    }
                    // Record allowed domain visit
                    if (domain != null) {
                        WebActivityCollector.recordVisit(domain)
                    }
                    // Forward allowed DNS queries to real DNS
                    forwardPacket(packet.array(), length, output)
                }
                // Non-DNS packets are dropped since we only route DNS
            } catch (e: Exception) {
                if (isRunning) {
                    Log.e(TAG, "VPN loop error: ${e.message}")
                    delay(100)
                }
            }
        }
    }

    private fun isDnsRequest(packet: ByteArray, length: Int): Boolean {
        if (length < 28) return false
        // Check IP version 4
        val version = (packet[0].toInt() shr 4) and 0xF
        if (version != 4) return false
        // Check protocol is UDP (17)
        val protocol = packet[9].toInt() and 0xFF
        if (protocol != 17) return false
        // Check destination port is 53 (DNS)
        val ipHeaderLen = (packet[0].toInt() and 0xF) * 4
        if (length < ipHeaderLen + 8) return false
        val dstPort = ((packet[ipHeaderLen + 2].toInt() and 0xFF) shl 8) or
            (packet[ipHeaderLen + 3].toInt() and 0xFF)
        return dstPort == 53
    }

    private fun extractDomainFromDns(packet: ByteArray, length: Int): String? {
        try {
            val ipHeaderLen = (packet[0].toInt() and 0xF) * 4
            val udpOffset = ipHeaderLen + 8 // UDP header is 8 bytes
            if (length < udpOffset + 12) return null

            // DNS question starts at offset 12 within DNS payload
            var offset = udpOffset + 12
            val parts = mutableListOf<String>()

            while (offset < length) {
                val labelLen = packet[offset].toInt() and 0xFF
                if (labelLen == 0) break
                offset++
                if (offset + labelLen > length) return null
                parts.add(String(packet, offset, labelLen))
                offset += labelLen
            }

            return parts.joinToString(".").lowercase()
        } catch (_: Exception) {
            return null
        }
    }

    private fun shouldBlockDomain(domain: String): Boolean {
        if (RuleManager.currentRules.value?.webFilter == null) return false
        return DomainBlockList.isBlocked(domain)
    }

    private fun buildNxDomainResponse(request: ByteArray, length: Int): ByteArray? {
        try {
            val ipHeaderLen = (request[0].toInt() and 0xF) * 4
            val udpOffset = ipHeaderLen
            val dnsOffset = udpOffset + 8

            // Build response by modifying the request
            val response = request.copyOf(length)

            // Swap source and destination IP
            for (i in 0..3) {
                val tmp = response[12 + i]
                response[12 + i] = response[16 + i]
                response[16 + i] = tmp
            }

            // Swap source and destination port
            val tmpPort0 = response[udpOffset]
            val tmpPort1 = response[udpOffset + 1]
            response[udpOffset] = response[udpOffset + 2]
            response[udpOffset + 1] = response[udpOffset + 3]
            response[udpOffset + 2] = tmpPort0
            response[udpOffset + 3] = tmpPort1

            // Set DNS flags: response, NXDOMAIN (rcode=3)
            response[dnsOffset + 2] = 0x81.toByte() // QR=1, Opcode=0, AA=0, TC=0, RD=1
            response[dnsOffset + 3] = 0x83.toByte() // RA=1, RCODE=3 (NXDOMAIN)

            // Zero UDP checksum (optional for IPv4)
            response[udpOffset + 6] = 0
            response[udpOffset + 7] = 0

            // Recalculate IP checksum
            recalculateIpChecksum(response, ipHeaderLen)

            return response
        } catch (_: Exception) {
            return null
        }
    }

    private fun forwardPacket(packet: ByteArray, length: Int, output: FileOutputStream) {
        val packetCopy = packet.copyOf(length)
        serviceScope.launch {
            try {
                val ipHeaderLen = (packetCopy[0].toInt() and 0xF) * 4
                val dnsPayload = packetCopy.copyOfRange(ipHeaderLen + 8, length)

                // Try multiple DNS servers for reliability
                for (dns in DNS_SERVERS) {
                    var socket: DatagramSocket? = null
                    try {
                        socket = DatagramSocket()
                        protect(socket) // Prevent VPN loop

                        val dnsAddress = InetAddress.getByName(dns)
                        val sendPacket = DatagramPacket(dnsPayload, dnsPayload.size, dnsAddress, 53)
                        socket.soTimeout = 3000
                        socket.send(sendPacket)

                        val responseBuffer = ByteArray(MTU_SIZE)
                        val receivePacket = DatagramPacket(responseBuffer, responseBuffer.size)
                        socket.receive(receivePacket)

                        val responseData = receivePacket.data.copyOf(receivePacket.length)
                        val fullResponse = buildResponsePacket(packetCopy, ipHeaderLen, responseData)
                        if (fullResponse != null) {
                            outputMutex.withLock {
                                output.write(fullResponse)
                                output.flush()
                            }
                        }
                        return@launch // Success, stop trying other servers
                    } catch (e: Exception) {
                        Log.w(TAG, "DNS forward failed with $dns: ${e.message}")
                    } finally {
                        socket?.close()
                    }
                }
                Log.e(TAG, "All DNS servers failed for query")
            } catch (e: Exception) {
                Log.e(TAG, "Forward packet error: ${e.message}")
            }
        }
    }

    private fun buildResponsePacket(
        originalPacket: ByteArray,
        ipHeaderLen: Int,
        dnsResponse: ByteArray,
    ): ByteArray? {
        try {
            val udpLen = 8 + dnsResponse.size
            val totalLen = ipHeaderLen + udpLen
            val response = ByteArray(totalLen)

            // Copy IP header
            System.arraycopy(originalPacket, 0, response, 0, ipHeaderLen)

            // Swap source/dest IP
            for (i in 0..3) {
                val tmp = response[12 + i]
                response[12 + i] = response[16 + i]
                response[16 + i] = tmp
            }

            // Update total length
            response[2] = ((totalLen shr 8) and 0xFF).toByte()
            response[3] = (totalLen and 0xFF).toByte()

            // Swap source/dest port
            val srcPort0 = originalPacket[ipHeaderLen + 2]
            val srcPort1 = originalPacket[ipHeaderLen + 3]
            response[ipHeaderLen] = srcPort0
            response[ipHeaderLen + 1] = srcPort1
            response[ipHeaderLen + 2] = originalPacket[ipHeaderLen]
            response[ipHeaderLen + 3] = originalPacket[ipHeaderLen + 1]

            // UDP length
            response[ipHeaderLen + 4] = ((udpLen shr 8) and 0xFF).toByte()
            response[ipHeaderLen + 5] = (udpLen and 0xFF).toByte()

            // Zero UDP checksum
            response[ipHeaderLen + 6] = 0
            response[ipHeaderLen + 7] = 0

            // Copy DNS response
            System.arraycopy(dnsResponse, 0, response, ipHeaderLen + 8, dnsResponse.size)

            // Recalculate IP checksum
            recalculateIpChecksum(response, ipHeaderLen)

            return response
        } catch (_: Exception) {
            return null
        }
    }

    /**
     * Recalculates the IPv4 header checksum after modifying packet fields.
     * Zeroes the existing checksum, computes one's complement sum over the header,
     * and writes the result back.
     */
    private fun recalculateIpChecksum(packet: ByteArray, ipHeaderLen: Int) {
        // Zero existing checksum
        packet[10] = 0
        packet[11] = 0

        var sum = 0L
        for (i in 0 until ipHeaderLen step 2) {
            val word = ((packet[i].toInt() and 0xFF) shl 8) or
                (if (i + 1 < ipHeaderLen) (packet[i + 1].toInt() and 0xFF) else 0)
            sum += word
        }

        // Fold 32-bit sum into 16 bits
        while (sum shr 16 > 0) {
            sum = (sum and 0xFFFF) + (sum shr 16)
        }

        val checksum = sum.toInt().inv() and 0xFFFF
        packet[10] = ((checksum shr 8) and 0xFF).toByte()
        packet[11] = (checksum and 0xFF).toByte()
    }

    private fun createVpnNotification(): Notification {
        val intent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(this, ParentHelperApp.CHANNEL_MONITORING)
            .setContentTitle("Web Filter Active")
            .setContentText("Protecting from harmful content")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        isRunning = false
        serviceScope.cancel()
        vpnInterface?.close()
        vpnInterface = null
        Log.d(TAG, "VPN stopped")
        super.onDestroy()
    }

    override fun onRevoke() {
        stopSelf()
    }

    companion object {
        private const val TAG = "WebFilterVpn"
        const val ACTION_STOP = "com.parenthelper.child.STOP_VPN"
        private const val NOTIFICATION_ID = 1002
        private const val VPN_ADDRESS = "10.0.0.2"
        private const val REAL_DNS = "8.8.8.8"
        private const val MTU_SIZE = 1500
        private val DNS_SERVERS = listOf("8.8.8.8", "8.8.4.4")
    }
}
