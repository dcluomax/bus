package com.maxluo.sttracker;

import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.SoundPool;
import android.nfc.cardemulation.HostApduService;
import android.os.Bundle;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.content.Context;
import android.util.Log;

import java.util.Arrays;

/**
 * HCE (Host Card Emulation) Service
 * 
 * Simulates a transit card (公交卡). When an external NFC card reader
 * sends a SELECT command to this phone, the service responds with
 * a success APDU and plays a "beep" sound — just like tapping a
 * real transit card on a bus fare reader.
 */
public class CardEmulationService extends HostApduService {
    private static final String TAG = "CardEmulation";

    // Status words
    private static final byte[] SELECT_OK = hexStringToByteArray("9000");
    private static final byte[] UNKNOWN_CMD = hexStringToByteArray("0000");

    // ISO-DEP SELECT APDU header (CLA INS P1 P2)
    private static final byte SELECT_INS = (byte) 0xA4;

    // Our transit card AID (7 bytes): F0 01 02 03 04 05 06
    // Using a proprietary AID in the F0xx range
    private static final byte[] TRANSIT_AID = hexStringToByteArray("F0010203040506");

    // Simple transit card response data (simulated card info)
    // In a real system this would contain balance, card ID, etc.
    private static final byte[] CARD_DATA = hexStringToByteArray(
            "4F52434100000001" +  // "ORCA" + card version
            "0000000000001388" +  // Simulated balance: 5000 (0x1388) = $50.00
            "9000"               // Status: OK
    );

    private SoundPool soundPool;
    private int beepSoundId = -1;
    private boolean soundLoaded = false;

    // Static flag to control whether emulation is active
    private static boolean emulationActive = true;

    public static void setEmulationActive(boolean active) {
        emulationActive = active;
    }

    public static boolean isEmulationActive() {
        return emulationActive;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "CardEmulationService created");
        initSound();
    }

    private void initSound() {
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

        soundPool = new SoundPool.Builder()
                .setMaxStreams(1)
                .setAudioAttributes(audioAttributes)
                .build();

        soundPool.setOnLoadCompleteListener((pool, sampleId, status) -> {
            if (status == 0) {
                soundLoaded = true;
                Log.d(TAG, "Beep sound loaded successfully");
            }
        });

        // Load the scan sound from res/raw
        try {
            beepSoundId = soundPool.load(this, R.raw.orca_scan, 1);
        } catch (Exception e) {
            Log.e(TAG, "Failed to load beep sound: " + e.getMessage());
        }
    }

    @Override
    public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
        if (commandApdu == null || commandApdu.length < 4) {
            return UNKNOWN_CMD;
        }

        Log.d(TAG, "Received APDU: " + bytesToHex(commandApdu));

        // Check if this is a SELECT command (INS = 0xA4)
        if (commandApdu[1] == SELECT_INS) {
            // Extract the AID from the APDU
            if (commandApdu.length >= 5) {
                int dataLength = commandApdu[4] & 0xFF;
                if (commandApdu.length >= 5 + dataLength) {
                    byte[] aid = Arrays.copyOfRange(commandApdu, 5, 5 + dataLength);
                    Log.d(TAG, "SELECT AID: " + bytesToHex(aid));

                    if (Arrays.equals(aid, TRANSIT_AID)) {
                        Log.d(TAG, "Transit card AID matched! Playing sound.");

                        // Play the beep and vibrate
                        playBeep();
                        vibrate();

                        // Notify the WebView that we got tapped
                        notifyWebView();

                        // Return card data + OK status
                        return CARD_DATA;
                    }
                }
            }

            // For any SELECT command (even if AID doesn't match), 
            // still respond OK — this makes generic readers work
            Log.d(TAG, "Generic SELECT — responding OK and playing sound");
            playBeep();
            vibrate();
            notifyWebView();
            return SELECT_OK;
        }

        // For READ/GET DATA commands, return card data
        byte ins = commandApdu[1];
        if (ins == (byte) 0xB0 || ins == (byte) 0xB2 || ins == (byte) 0xCA) {
            Log.d(TAG, "READ/GET DATA command — returning card data");
            return CARD_DATA;
        }

        // For any other command, return OK
        return SELECT_OK;
    }

    @Override
    public void onDeactivated(int reason) {
        String reasonStr = (reason == DEACTIVATION_LINK_LOSS) ? "link loss" : "another AID selected";
        Log.d(TAG, "Card deactivated: " + reasonStr);
    }

    private void playBeep() {
        if (soundPool != null && soundLoaded && beepSoundId != -1) {
            soundPool.play(beepSoundId, 1.0f, 1.0f, 1, 0, 1.0f);
            Log.d(TAG, "Beep sound played");
        } else {
            Log.d(TAG, "Sound not ready, using fallback MediaPlayer");
            playFallbackSound();
        }
    }

    private void playFallbackSound() {
        try {
            MediaPlayer mp = MediaPlayer.create(this, R.raw.orca_scan);
            if (mp != null) {
                mp.setOnCompletionListener(MediaPlayer::release);
                mp.start();
            }
        } catch (Exception e) {
            Log.e(TAG, "Fallback sound error: " + e.getMessage());
        }
    }

    private void vibrate() {
        try {
            Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null && vibrator.hasVibrator()) {
                vibrator.vibrate(VibrationEffect.createOneShot(200, VibrationEffect.DEFAULT_AMPLITUDE));
            }
        } catch (Exception e) {
            Log.e(TAG, "Vibrate error: " + e.getMessage());
        }
    }

    private void notifyWebView() {
        try {
            Intent intent = new Intent("com.maxluo.sttracker.CARD_TAPPED");
            intent.setPackage(getPackageName());
            sendBroadcast(intent);
        } catch (Exception e) {
            Log.e(TAG, "Notify error: " + e.getMessage());
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (soundPool != null) {
            soundPool.release();
            soundPool = null;
        }
    }

    private static byte[] hexStringToByteArray(String s) {
        int len = s.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(s.charAt(i), 16) << 4)
                    + Character.digit(s.charAt(i + 1), 16));
        }
        return data;
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02X", b));
        }
        return sb.toString();
    }
}
