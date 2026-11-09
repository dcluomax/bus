package com.maxluo.sttracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "STTracker";
    private NfcAdapter nfcAdapter;
    
    // Broadcast receiver for HCE card tap events
    private BroadcastReceiver cardTappedReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup NFC adapter reference
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        if (nfcAdapter != null) {
            Log.d(TAG, "NFC adapter found — HCE card emulation is handled by CardEmulationService");
        } else {
            Log.d(TAG, "NFC not available on this device");
        }
        
        // Register receiver for card tap events from CardEmulationService
        cardTappedReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                Log.d(TAG, "Card tapped broadcast received — notifying WebView");
                notifyWebViewCardTapped();
            }
        };
        
        IntentFilter filter = new IntentFilter("com.maxluo.sttracker.CARD_TAPPED");
        registerReceiver(cardTappedReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.d(TAG, "Activity resumed — HCE service active in background");
    }

    @Override
    protected void onPause() {
        super.onPause();
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (cardTappedReceiver != null) {
            unregisterReceiver(cardTappedReceiver);
        }
    }

    /**
     * Notify the WebView that a card reader tapped the phone.
     * This triggers the JavaScript 'card-tapped' event and plays
     * the sound/vibration feedback in the web app.
     */
    private void notifyWebViewCardTapped() {
        String js = "if(window.STNative && window.STNative.onCardTapped) { " +
                    "window.STNative.onCardTapped(); " +
                    "} else { " +
                    "window.dispatchEvent(new Event('card-tapped')); " +
                    "}";
        
        bridge.getWebView().post(() -> {
            bridge.getWebView().evaluateJavascript(js, null);
        });
    }
}
