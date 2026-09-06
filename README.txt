JIVPIX Android v1
=================
This is the first native Android shell for JIVPIX.

Included:
- Current JIVPIX web UI inside a native Android WebView.
- Supabase integration remains in the existing app.js.
- Native Android bridge for network/Wi-Fi/VPN status.
- DNS and tracker-blocker integration points prepared.
- No VPN tunnel is enabled yet.
- No device-wide DNS/tracker filtering is falsely claimed as active.

Important:
Device-wide DNS protection and tracker blocking require a native traffic
interception layer. On Android this is normally implemented through a
VpnService/local tunnel, which is part of the later VPN/tunnel stage.

Build:
Open this folder in Android Studio and build the debug APK.
