package com.flashbites.app;

import android.graphics.Color;
import android.os.Bundle;

import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Keep WebView content below the system status bar on Android devices.
		WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
		getWindow().setStatusBarColor(Color.BLACK);

		WindowInsetsControllerCompat insetsController =
			WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
		if (insetsController != null) {
			insetsController.setAppearanceLightStatusBars(false);
		}
	}
}
