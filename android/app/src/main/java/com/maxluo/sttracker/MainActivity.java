package com.maxluo.sttracker;

import android.app.PendingIntent;
import android.content.Intent;
import android.content.IntentFilter;
import android.nfc.NfcAdapter;
import android.nfc.Tag;
import android.nfc.tech.NfcA;
import android.nfc.tech.NfcB;
import android.nfc.tech.NfcF;
import android.nfc.tech.NfcV;
import android.nfc.tech.IsoDep;
import android.nfc.tech.MifareClassic;
import android.nfc.tech.MifareUltralight;
import android.os.Bundle;
import android.util.Log;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "STTracker";
    private NfcAdapter nfcAdapter;
    private PendingIntent pendingIntent;
    private IntentFilter[] intentFiltersArray;
    private String[][] techListsArray;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Setup NFC
        nfcAdapter = NfcAdapter.getDefaultAdapter(this);
        
        if (nfcAdapter != null) {
            Log.d(TAG, "NFC adapter found");
            
            // Create pending intent for NFC foreground dispatch
            Intent intent = new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            pendingIntent = PendingIntent.getActivity(this, 0, intent, 
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE);
            
            // Setup intent filters for NDEF and all NFC tags
            IntentFilter ndef = new IntentFilter(NfcAdapter.ACTION_NDEF_DISCOVERED);
            IntentFilter tech = new IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED);
            IntentFilter tag = new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED);
            
            intentFiltersArray = new IntentFilter[] { ndef, tech, tag };
            
            // Tech list for ORCA cards (typically ISO-DEP / NFC-A)
            techListsArray = new String[][] {
                new String[] { IsoDep.class.getName() },
                new String[] { NfcA.class.getName() },
                new String[] { NfcB.class.getName() },
                new String[] { NfcF.class.getName() },
                new String[] { NfcV.class.getName() },
                new String[] { MifareClassic.class.getName() },
                new String[] { MifareUltralight.class.getName() }
            };
        } else {
            Log.d(TAG, "NFC not available on this device");
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        
        // Enable NFC foreground dispatch
        if (nfcAdapter != null) {
            nfcAdapter.enableForegroundDispatch(this, pendingIntent, intentFiltersArray, techListsArray);
            Log.d(TAG, "NFC foreground dispatch enabled");
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        
        // Disable NFC foreground dispatch
        if (nfcAdapter != null) {
            nfcAdapter.disableForegroundDispatch(this);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        
        String action = intent.getAction();
        Log.d(TAG, "onNewIntent action: " + action);
        
        if (NfcAdapter.ACTION_TAG_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_TECH_DISCOVERED.equals(action) ||
            NfcAdapter.ACTION_NDEF_DISCOVERED.equals(action)) {
            
            Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
            if (tag != null) {
                byte[] id = tag.getId();
                String serialNumber = bytesToHex(id);
                Log.d(TAG, "NFC Tag detected: " + serialNumber);
                
                // Send to WebView via JavaScript
                String js = "if(window.STNative && window.STNative.showNfcPopup) { " +
                           "window.STNative.playNfcSound(); " +
                           "window.STNative.showNfcPopup('" + serialNumber + "'); " +
                           "} else { " +
                           "var modal = document.getElementById('nfc-modal'); " +
                           "var serialEl = document.getElementById('nfc-serial'); " +
                           "if(serialEl) serialEl.textContent = 'Card ID: " + serialNumber + "'; " +
                           "if(modal) modal.classList.add('show'); " +
                           "var audio = new Audio('sounds/orca-scan.mp3'); audio.play(); " +
                           "if(navigator.vibrate) navigator.vibrate([100,50,100]); " +
                           "}";
                
                bridge.getWebView().post(() -> {
                    bridge.getWebView().evaluateJavascript(js, null);
                });
            }
        }
    }
    
    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
