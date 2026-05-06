package com.flashbites.app;

import android.os.Bundle;

import androidx.core.view.WindowInsetsControllerCompat;
import androidx.activity.EdgeToEdge;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		// Enable edge-to-edge so Android 15+ and older versions share the same layout behavior.
		EdgeToEdge.enable(this);

		// Configure appearance of system bars
		WindowInsetsControllerCompat insetsController =
			new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
		if (insetsController != null) {
			// Use dark icons for status bar (light background)
			insetsController.setAppearanceLightStatusBars(false);
		}
	}
}
