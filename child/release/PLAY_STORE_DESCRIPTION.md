# Play Store listing text — required policy disclosures

Two Jul 13 2026 rejections are fixed by **listing text only** (no code):

1. *VpnService policy* — "Use of VpnService is not documented in the app description."
   → Google requires the description to document the VpnService use **and explain why it is
   needed**, with details of the relevant in-app features.
2. *Stalkerware and Monitoring Applications policy* — "Apps must disclose monitoring or
   tracking functionality in the Google Play store description."

**Keep your existing marketing copy** and append the two sections below to the
**Full description** field of the `Prime Kids: Child` listing (Play Console →
Grow → Store presence → Main store listing).

---

## ENGLISH — append to Full description

### Web content filtering (VPN)

Prime Kids: Child uses Android's VpnService to run a **local, on-device VPN**. This VPN is
used **only** to filter web content. It does **not** route traffic to any remote VPN server,
does not anonymise or hide your connection, and is **not** a general-purpose or privacy VPN.

How it is used:

• DNS requests made on this device are checked **on the device** against the categories the
  parent has blocked (adult, gambling, violence and similar), plus any specific sites the
  parent has added.
• Requests to blocked sites are rejected locally, and the child is shown a "Site Blocked"
  screen explaining that the site is blocked by their parent's filter.
• All other requests are passed through to public DNS servers unchanged.

VpnService is required because it is the only reliable way to apply the parent's web filter
across **every** browser and app on the device — including browsers that use encrypted DNS
(DNS-over-HTTPS), which would otherwise bypass the filter entirely.

The websites visited and blocked on this device are recorded and shared with the parent's
Prime Kids account so the parent can review them. This data is sent over an encrypted
connection, is never sold, and is never shared with third parties.

### Monitoring disclosure

Prime Kids: Child is a **parental control and monitoring application**. It is intended only
to be installed by a parent or legal guardian, on a device used by their own child, with the
child's knowledge.

While it is running, this app monitors this device and reports the following to the parent's
Prime Kids account:

• Websites visited and websites blocked
• App usage and screen time
• Device location, including while the app is closed or not in use (background location)

This app shows a permanent notification and its own clearly identifiable icon at all times
while it is running. It never hides itself or disguises its purpose. It must **not** be used
to monitor any other person, including another adult.

---

## МОНГОЛ — Дэлгэрэнгүй тайлбар дээр нэмэх

> ⚠️ Монгол орчуулгыг нийтлэхийн өмнө хянана уу.

### Вэб контент шүүлтүүр (VPN)

Prime Kids: Child нь Android-ын VpnService ашиглан **төхөөрөмж дээрх дотоод VPN** ажиллуулдаг.
Энэхүү VPN нь зөвхөн вэб контент шүүхэд ашиглагдана. Энэ нь таны траффикийг гадаад VPN сервер
рүү дамжуулдаггүй, холболтыг нууцалдаггүй бөгөөд ерөнхий зориулалтын VPN **биш** юм.

Хэрхэн ажилладаг вэ:

• Төхөөрөмжөөс хийгдэх DNS хүсэлтийг **төхөөрөмж дээр нь шууд** шалгаж, эцэг эхийн хаасан
  ангилал (насанд хүрэгчдийн, мөрийтэй тоглоом, хүчирхийлэл гэх мэт) болон эцэг эхийн нэмсэн
  сайтуудтай тулгана.
• Хаагдсан сайт руу хандах хүсэлтийг төхөөрөмж дээр татгалзаж, хүүхдэд "Сайт хаагдсан" гэсэн
  мэдэгдэл харуулна.
• Бусад бүх хүсэлтийг нийтийн DNS сервер рүү хэвийн дамжуулна.

VpnService шаардлагатай учир нь энэ бол эцэг эхийн вэб шүүлтүүрийг төхөөрөмж дээрх **бүх**
хөтөч, апп дээр найдвартай хэрэгжүүлэх цорын ганц арга юм — үүнд шифрлэгдсэн DNS
(DNS-over-HTTPS) ашигладаг хөтчүүд багтана.

Энэ төхөөрөмж дээр зочилсон болон хаагдсан вэб сайтуудыг бүртгэж, эцэг эхийн Prime Kids
бүртгэл рүү илгээнэ. Энэ мэдээллийг шифрлэгдсэн холболтоор дамжуулах бөгөөд хэзээ ч
худалдаалахгүй, гуравдагч этгээдэд дамжуулахгүй.

### Хяналтын тухай мэдэгдэл

Prime Kids: Child бол **эцэг эхийн хяналтын програм** юм. Үүнийг зөвхөн эцэг эх буюу
хууль ёсны асран хамгаалагч нь өөрийн хүүхдийн ашигладаг төхөөрөмж дээр, хүүхдийн мэдэлтэйгээр
суулгах зориулалттай.

Ажиллаж байх үед энэ апп дараах мэдээллийг эцэг эхийн Prime Kids бүртгэл рүү илгээнэ:

• Зочилсон болон хаагдсан вэб сайтууд
• Апп ашиглалт, дэлгэцийн цаг
• Төхөөрөмжийн байршил (апп хаалттай эсвэл ашиглагдаагүй үед ч)

Энэ апп ажиллаж байх бүх хугацаанд байнгын мэдэгдэл болон өөрийн тодорхой дүрсийг харуулна.
Өөрийгөө нуухгүй. Үүнийг өөр хүн (тэр дундаа насанд хүрэгч) хянахад ашиглаж **болохгүй**.
