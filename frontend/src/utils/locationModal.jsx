import React, { useState } from "react";

const LocationModal = ({ setLocation, closeModal }) => {
  const [manualAddress, setManualAddress] = useState("");
  const [error, setError] = useState("");

  // 📍 Get Current Location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // 🔁 Reverse Geocoding (using OpenStreetMap free API)
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await res.json();

        const address = data.display_name;

        const locationData = {
          address,
          lat: latitude,
          lng: longitude,
        };

        localStorage.setItem("location", JSON.stringify(locationData));
        setLocation(locationData);
        closeModal();
      },
      () => {
        setError("Permission denied. Please allow location.");
      }
    );
  };

  // 📝 Manual Address
  const handleManualSubmit = () => {
    if (!manualAddress) return;

    const locationData = {
      address: manualAddress,
    };

    localStorage.setItem("location", JSON.stringify(locationData));
    setLocation(locationData);
    closeModal();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2>Select Your Location</h2>

        <button onClick={handleCurrentLocation}>
          Use Current Location 📍
        </button>

        <div style={{ margin: "20px 0" }}>OR</div>

        <input
          type="text"
          placeholder="Enter delivery address"
          value={manualAddress}
          onChange={(e) => setManualAddress(e.target.value)}
        />

        <button onClick={handleManualSubmit}>Confirm Address</button>

        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100%",
    height: "100vh",
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    textAlign: "center",
    width: "300px",
  },
};

export default LocationModal;