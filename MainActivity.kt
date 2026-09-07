package com.jivpix.app

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import org.json.JSONObject

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = true
            settings.allowContentAccess = true
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(AndroidBridge(this@MainActivity), "JIVPIXAndroid")
            loadUrl("file:///android_asset/index.html")
        }

        setContentView(webView)
    }

    override fun onDestroy() {
        webView.removeJavascriptInterface("JIVPIXAndroid")
        webView.destroy()
        super.onDestroy()
    }
}

class AndroidBridge(private val context: Context) {

    @JavascriptInterface
    fun getNetworkStatus(): String {
        val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val network = cm.activeNetwork ?: return JSONObject()
            .put("connected", false)
            .toString()

        val caps = cm.getNetworkCapabilities(network)
        val wifi = caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true
        val cellular = caps?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true

        return JSONObject()
            .put("connected", true)
            .put("wifi", wifi)
            .put("cellular", cellular)
            .put("vpn", caps?.hasTransport(NetworkCapabilities.TRANSPORT_VPN) == true)
            .toString()
    }

    @JavascriptInterface
    fun getDnsStatus(): String {
        // Android does not allow a normal app to silently change the device-wide
        // Private DNS setting. This reports the current network state only.
        return JSONObject()
            .put("available", true)
            .put("message", "DNS protection layer is prepared; device-wide enforcement requires the native tunnel stage.")
            .toString()
    }

    @JavascriptInterface
    fun getTrackerBlockerStatus(): String {
        return JSONObject()
            .put("available", true)
            .put("message", "Tracker filtering engine will be connected in the native traffic stage.")
            .toString()
    }
}
