# 🔔 Sound Notifications - Quick Start Guide

## Overview
FlashBites now has **real-time sound notifications** for new orders and status updates!

---

## 🎯 Who Gets Notifications?

### 🏪 Restaurant Owners
- **Get alerted when**: New order is placed at your restaurant
- **Sound**: Two-tone alert beep
- **Shows**: Order number, total amount, customer details

### 👤 Users (Customers)
- **Get alerted when**: Your order status changes
- **Sound**: Pleasant single tone
- **Shows**: Order status (confirmed, preparing, ready, out for delivery, delivered)

### 👑 Admins
- **Get alerted when**: Any order is placed on the platform
- **Sound**: Two-tone alert beep
- **Shows**: All order details for monitoring

---

## 🚀 Quick Setup (2 Steps)

### Step 1: Enable Notifications
1. Login to FlashBites
2. Click the **🔔 bell icon** in the navbar (top right)
3. Toggle **Sound** to ON (orange)
4. (Optional) Click **Enable Notifications** for browser alerts

### Step 2: Test It!
- **Restaurant Owners**: Wait for a customer to place an order
- **Users**: Place an order and wait for status updates
- **Admins**: Monitor any order on the platform

---

## 🎵 What You'll Hear

| Event | Sound Description | Who Hears It |
|-------|------------------|--------------|
| New Order | 🔔 Beep-boop-beep | Restaurant Owner, Admin |
| Order Update | 🔊 Ding! | User (Customer) |
| Order Ready | 🔊 Ding! | User |
| Out for Delivery | 🔊 Ding! | User |
| Delivered | 🔊 Ding! | User |

---

## 📱 Notification Bell Features

Click the **🔔 bell icon** to access:

- ✅ **Connection Status** - Green dot = connected, receiving live updates
- 🔊 **Sound Toggle** - Turn notification sounds on/off instantly
- 🌐 **Browser Notifications** - Get alerts even when tab is inactive
- ⚙️ **Full Settings** - Visit `/notifications` for detailed controls

---

## 🔧 Settings Persist

Your notification preferences are **saved automatically**:
- Sound on/off setting
- Browser permission status
- No need to re-enable every time!

---

## 💡 Pro Tips

1. **Click anywhere** on the page after login to activate sounds (browser requirement)
2. **Keep tab open** in background to hear notifications
3. **Enable browser notifications** to get alerts even when tab is minimized
4. **Green dot** on bell icon = you're connected and will receive alerts
5. **Toggle sound** anytime - connection stays active

---

## 🎬 How It Works

```
New Order Flow:
Customer places order → 
Server creates order → 
WebSocket sends event → 
Sound plays instantly → 
Toast notification appears → 
Browser notification (if enabled)
```

**Speed**: Instant! No delays, no polling, pure real-time.

---

## 🐛 Troubleshooting

### No Sound Playing?
- ✅ Click anywhere on page to initialize audio
- ✅ Check sound toggle is ON (orange)
- ✅ Verify browser volume is up
- ✅ Try toggling sound off and on again

### Not Receiving Notifications?
- ✅ Check bell icon has green dot (connected)
- ✅ Verify you're logged in
- ✅ Refresh the page
- ✅ Check browser console for errors

### Browser Notifications Not Working?
- ✅ Click "Enable Notifications" button
- ✅ Check browser settings (allow notifications)
- ✅ Note: Won't work in incognito/private mode

---

## 📍 Where to Find Settings

- **Quick Access**: Click 🔔 bell icon in navbar
- **Full Settings**: Profile → Settings → Notifications
- **Or visit**: `/notifications` page directly

---

## 🎉 You're All Set!

Once enabled, you'll receive instant notifications with sound for:
- Every new order (restaurant owners, admins)
- Every status update (customers)
- All in real-time, no refresh needed!

**Enjoy your seamless notification experience!** ��

---

**Need Help?** Check the connection indicator or visit `/notifications` for troubleshooting.
