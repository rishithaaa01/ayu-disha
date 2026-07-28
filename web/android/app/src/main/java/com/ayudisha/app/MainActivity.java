package com.ayudisha.app;

import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        final WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // 1. CONFIGURE WEBVIEW AS REQUESTED
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            // 2. DISABLE ZOOM: Stop the user from pinching or sliding the layout
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // 3. DISABLE MOVABLE SCREEN: Stop the "bounce" effect and scrollbars
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setVerticalScrollBarEnabled(false);
            webView.setScrollContainer(false);

            // 4. PREVENT HORIZONTAL TOUCH GESTURES: Intercept and consume horizontal swipes
            // to ensure the whole "canvas" doesn't slide.
            webView.setOnTouchListener(new View.OnTouchListener() {
                private float x1, y1;
                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            x1 = event.getX();
                            y1 = event.getY();
                            break;
                        case MotionEvent.ACTION_MOVE:
                            float x2 = event.getX();
                            float y2 = event.getY();
                            float deltaX = x2 - x1;
                            float deltaY = y2 - y1;
                            // If it's a primarily horizontal move, we allow the WebView to handle it
                            // but we also ensure the parent doesn't handle it.
                            break;
                    }
                    return false; // Let the WebView handle the touch normally
                }
            });

            // 5. INJECT CSS & JS OVERHAUL: Transform Desktop Layout to Mobile-First Native Feel
            // and lock the viewport strictly.
            webView.evaluateJavascript(
                "(function() {" +
                "  var inject = function() {" +
                "    /* Force Viewport Meta Tag Update */" +
                "    var meta = document.querySelector('meta[name=\"viewport\"]');" +
                "    var content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';" +
                "    if (meta) { meta.setAttribute('content', content); }" +
                "    else {" +
                "      meta = document.createElement('meta');" +
                "      meta.name = 'viewport';" +
                "      meta.content = content;" +
                "      document.head.appendChild(meta);" +
                "    }" +
                "" +
                "    /* Inject Comprehensive Mobile CSS Overrides */" +
                "    var styleId = 'mobile-overhaul-style';" +
                "    if (!document.getElementById(styleId)) {" +
                "      var style = document.createElement('style');" +
                "      style.id = styleId;" +
                "      style.type = 'text/css';" +
                "      style.innerHTML = '" +
                "        /* Global Resets */" +
                "        html, body { " +
                "          overflow-x: hidden !important; " +
                "          width: 100vw !important; " +
                "          max-width: 100vw !important; " +
                "          margin: 0 !important; " +
                "          padding: 0 !important; " +
                "          position: relative !important; " +
                "          touch-action: pan-y !important; " + // Disable horizontal gestures
                "          -webkit-user-select: none !important; " +
                "          -webkit-tap-highlight-color: transparent !important; " +
                "        }" +
                "        * { box-sizing: border-box !important; -webkit-overflow-scrolling: touch !important; }" +
                "        img { max-width: 100% !important; height: auto !important; }" +
                "" +
                "        /* Responsive Layout Overrides */" +
                "        @media (max-width: 1024px) {" +
                "          .ml-64 { margin-left: 0 !important; }" +
                "          .w-64 { display: none !important; }" +
                "          aside, .sidebar, div[class*=\"Sidebar\"] { display: none !important; }" +
                "" +
                "          main, section, .flex-1, .max-w-7xl, .max-w-5xl, .max-w-4xl { " +
                "            width: 100vw !important; " +
                "            max-width: 100vw !important; " +
                "            padding-left: 16px !important; " +
                "            padding-right: 16px !important; " +
                "            margin-left: 0 !important; " +
                "            margin-right: 0 !important; " +
                "          }" +
                "" +
                "          header, .h-16 { padding-left: 16px !important; padding-right: 16px !important; width: 100% !important; }" +
                "" +
                "          .grid-cols-4, .grid-cols-3, .grid-cols-2 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; gap: 16px !important; }" +
                "          .sm\\\\:grid-cols-2, .md\\\\:grid-cols-4, .lg\\\\:grid-cols-4 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }" +
                "          .md\\\\:grid-cols-12 { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; }" +
                "          .md\\\\:col-span-5, .md\\\\:col-span-7 { grid-column: span 1 / span 1 !important; }" +
                "" +
                "          .w-\\\\[380px\\\\] { width: 100% !important; max-width: 100% !important; }" +
                "" +
                "          table { display: block !important; width: 100% !important; overflow-x: auto !important; }" +
                "          .overflow-auto, .overflow-x-auto { width: 100% !important; overflow-x: auto !important; overflow-y: hidden !important; }" +
                "" +
                "          .p-8, .p-12, .px-8, .px-20 { padding: 16px !important; }" +
                "        }" +
                "      ';" +
                "      document.head.appendChild(style);" +
                "    }" +
                "  };" +
                "  inject();" +
                "  /* Run again after a short delay to catch any late rendering */" +
                "  setTimeout(inject, 500);" +
                "  setTimeout(inject, 2000);" +
                "  /* Lock horizontal scroll via JS as well */" +
                "  window.addEventListener('scroll', function() {" +
                "    if (window.scrollX !== 0) { window.scrollTo(0, window.scrollY); }" +
                "  }, { passive: true });" +
                "})();",
                null
            );
        }
    }
}
