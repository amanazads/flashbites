package com.flashbites.app;

import android.os.Build;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Enable edge-to-edge display: allow system bars to draw behind app content
		// For Android 15+, transparent colors + fitsSystemWindows=false in theme enables edge-to-edge
		WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

		// Configure appearance of system bars
		WindowInsetsControllerCompat insetsController =
			WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
		if (insetsController != null) {
			// Use dark icons for status bar (light background)
			insetsController.setAppearanceLightStatusBars(false);
		}
	}
}
