import { useCallback, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import { App as CapacitorApp } from '@capacitor/app';
import packageJson from '../../package.json';
import { getPlatformSettings } from '../api/settingsApi';

const DISMISSED_UPDATE_VERSION_KEY = 'flashbites.dismissedAppUpdateVersion';

const isNativePlatform = () => Boolean(window?.Capacitor?.isNativePlatform?.());

const parseVersion = (value) => String(value || '').trim().split('.').map((segment) => {
  const numeric = Number(segment);
  return Number.isFinite(numeric) ? numeric : 0;
});

const compareVersions = (left, right) => {
  const a = parseVersion(left);
  const b = parseVersion(right);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
};

const openStoreLink = (storeUrl) => {
  if (storeUrl) {
    window.open(storeUrl, '_blank', 'noopener,noreferrer');
  }
};

export const useAppUpdate = () => {
  const checkingRef = useRef(false);
  const currentVersion = packageJson.version;

  const checkForUpdate = useCallback(async () => {
    if (!isNativePlatform() || checkingRef.current) return;

    checkingRef.current = true;
    try {
      const response = await getPlatformSettings();
      const settings = response?.data?.data?.settings || response?.data?.settings || response?.settings || response?.data || {};
      const latestVersion = String(settings.mobileAppVersion || '').trim();
      const storeUrl = String(settings.mobileAppStoreUrl || '').trim();
      const forceUpdate = Boolean(settings.forceMobileAppUpdate);
      const releaseNotes = String(settings.mobileAppReleaseNotes || '').trim();

      if (!latestVersion) return;
      if (compareVersions(latestVersion, currentVersion) <= 0) return;

      const dismissedVersion = localStorage.getItem(DISMISSED_UPDATE_VERSION_KEY);
      if (!forceUpdate && dismissedVersion === latestVersion) return;

      const result = await Swal.fire({
        title: forceUpdate ? 'Update required' : 'Update available',
        html: `
          <div style="text-align:left; line-height:1.6">
            <p>${forceUpdate ? 'A required update is available for FlashBites.' : 'A newer version of FlashBites is available.'}</p>
            <p><strong>Current version:</strong> ${currentVersion}</p>
            <p><strong>Latest version:</strong> ${latestVersion}</p>
            ${releaseNotes ? `<p style="margin-top:12px; white-space:pre-line;"><strong>What\'s new:</strong>\n${releaseNotes}</p>` : ''}
          </div>
        `,
        icon: 'info',
        showCancelButton: !forceUpdate,
        confirmButtonText: 'Update now',
        cancelButtonText: 'Later',
        allowOutsideClick: !forceUpdate,
        allowEscapeKey: !forceUpdate,
        showCloseButton: !forceUpdate,
        focusConfirm: true,
      });

      if (result.isConfirmed) {
        openStoreLink(storeUrl);
      } else if (!forceUpdate) {
        localStorage.setItem(DISMISSED_UPDATE_VERSION_KEY, latestVersion);
      }
    } catch (error) {
      console.error('Failed to check app update:', error);
    } finally {
      checkingRef.current = false;
    }
  }, [currentVersion]);

  useEffect(() => {
    checkForUpdate();

    let listenerHandle = null;
    const initListener = async () => {
      listenerHandle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          checkForUpdate();
        }
      });
    };

    initListener();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [checkForUpdate]);
};
