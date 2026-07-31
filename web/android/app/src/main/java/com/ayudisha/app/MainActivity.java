package com.ayudisha.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int MICROPHONE_PERMISSION_REQUEST_CODE = 1001;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Enable Edge-to-Edge display so WebView extends behind status and navigation bars
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }

    @Override
    public void onStart() {
        super.onStart();
        final WebView webView = this.bridge.getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // Enable JavaScript and DOM storage
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            settings.setMediaPlaybackRequiresUserGesture(false);

            // Disable viewport pinching and zoom controls
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // Lock horizontal movable screen and overscroll bounce
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setVerticalScrollBarEnabled(false);

            // Configure WebChromeClient to delegate HTML5 getUserMedia microphone permission requests
            webView.setWebChromeClient(new WebChromeClient() {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    boolean requiresAudio = false;
                    for (String resource : request.getResources()) {
                        if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(resource)) {
                            requiresAudio = true;
                            break;
                        }
                    }

                    if (requiresAudio) {
                        if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO) 
                                == PackageManager.PERMISSION_GRANTED) {
                            request.grant(request.getResources());
                        } else {
                            pendingPermissionRequest = request;
                            ActivityCompat.requestPermissions(
                                MainActivity.this,
                                new String[]{Manifest.permission.RECORD_AUDIO},
                                MICROPHONE_PERMISSION_REQUEST_CODE
                            );
                        }
                    } else {
                        super.onPermissionRequest(request);
                    }
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == MICROPHONE_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                    pendingPermissionRequest = null;
                }
            } else {
                if (pendingPermissionRequest != null) {
                    pendingPermissionRequest.deny();
                    pendingPermissionRequest = null;
                }
                
                boolean showRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                    this, Manifest.permission.RECORD_AUDIO
                );

                if (!showRationale) {
                    // Permission permanently denied by user -> guide to Android Settings
                    Toast.makeText(this, "Microphone permission is required. Please enable it in Settings.", Toast.LENGTH_LONG).show();
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        Uri uri = Uri.fromParts("package", getPackageName(), null);
                        intent.setData(uri);
                        startActivity(intent);
                    } catch (Exception ignored) {}
                } else {
                    Toast.makeText(this, "Microphone permission denied. Voice input requires microphone access.", Toast.LENGTH_SHORT).show();
                }
            }
        }
    }
}
