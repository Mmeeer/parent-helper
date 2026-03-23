package com.parenthelper.child.enforcement

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor
import android.util.Log
import com.parenthelper.child.collectors.WebActivityCollector
import kotlinx.coroutines.*
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

        val builder = Builder()
            .setSession("ParentHelper WebFilter")
            .addAddress(VPN_ADDRESS, 32)
            .addRoute(DNS_SERVER, 32)  // Only route DNS traffic to our fake DNS IP
            .addDnsServer(DNS_SERVER)  // Redirect DNS queries to 10.0.0.1 (routed through TUN)
            .setMtu(MTU_SIZE)
            .setBlocking(true)

        vpnInterface = builder.establish() ?: run {
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
                if (!isDnsRequest(packet.array(), length)) {
                    continue
                }

                val domain = extractDomainFromDns(packet.array(), length)
                Log.d(TAG, "DNS query: $domain (${length} bytes)")

                if (domain != null && shouldBlockDomain(domain)) {
                    Log.d(TAG, "Blocking: $domain")
                    WebActivityCollector.recordBlocked(domain)
                    val response = buildNxDomainResponse(packet.array(), length)
                    if (response != null) {
                        output.write(response)
                        output.flush()
                    }
                } else {
                    val response = forwardDnsQuery(packet.array(), length)
                    if (response != null) {
                        if (domain != null) {
                            WebActivityCollector.recordVisit(domain)
                        }
                        output.write(response)
                        output.flush()
                    } else {
                        Log.e(TAG, "Forward FAILED: $domain")
                    }
                }
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
        val rules = RuleManager.currentRules.value?.webFilter ?: return false

        // Check custom allow list first (overrides blocking)
        for (allowed in rules.customAllow) {
            if (domain == allowed || domain.endsWith(".$allowed")) {
                return false
            }
        }

        // Check custom block list
        for (blocked in rules.customBlock) {
            if (domain == blocked || domain.endsWith(".$blocked")) {
                return true
            }
        }

        // Category-based blocking from synced ContentFilter domains
        val blockedDomains = DomainBlockList.getBlockedDomains()
        for (blocked in blockedDomains) {
            if (domain == blocked || domain.endsWith(".$blocked")) {
                return true
            }
        }

        return false
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

    /**
     * Forward a DNS query to the real DNS server synchronously.
     * Returns the full IP/UDP packet to write back to the TUN interface, or null on failure.
     */
    private fun forwardDnsQuery(packet: ByteArray, length: Int): ByteArray? {
        val ipHeaderLen = (packet[0].toInt() and 0xF) * 4
        val dnsPayload = packet.copyOfRange(ipHeaderLen + 8, length)

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

                // Build the full IP/UDP response packet
                val responseData = receivePacket.data.copyOf(receivePacket.length)
                return buildResponsePacket(packet, ipHeaderLen, responseData)
            } catch (e: Exception) {
                Log.w(TAG, "DNS forward to $dns failed: ${e.message}")
            } finally {
                socket?.close()
            }
        }

        Log.e(TAG, "All DNS servers failed for query")
        return null
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

    private fun recalculateIpChecksum(packet: ByteArray, ipHeaderLen: Int) {
        // Clear existing checksum
        packet[10] = 0
        packet[11] = 0

        var checksum: Long = 0
        for (i in 0 until ipHeaderLen step 2) {
            val word = ((packet[i].toInt() and 0xFF) shl 8) or
                (if (i + 1 < ipHeaderLen) packet[i + 1].toInt() and 0xFF else 0)
            checksum += word
        }
        // Fold carry bits
        while (checksum shr 16 != 0L) {
            checksum = (checksum and 0xFFFF) + (checksum shr 16)
        }
        val result = checksum.inv().toInt() and 0xFFFF
        packet[10] = ((result shr 8) and 0xFF).toByte()
        packet[11] = (result and 0xFF).toByte()
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
        private const val VPN_ADDRESS = "10.0.0.2"
        private const val DNS_SERVER = "10.0.0.1"
        private val DNS_SERVERS = listOf("8.8.8.8", "8.8.4.4", "1.1.1.1")
        private const val MTU_SIZE = 1500
    }
}
