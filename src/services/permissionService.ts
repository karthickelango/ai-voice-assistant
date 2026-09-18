/**
 * Permission Service for Karthick AI / Thruv
 * Handles checking and triggering native browser permissions for Microphone and Location.
 */

export interface SystemPermissionsStatus {
  microphone: 'granted' | 'denied' | 'prompt' | 'unsupported';
  location: 'granted' | 'denied' | 'prompt' | 'unsupported';
}

/**
 * Check current browser permission states
 */
export async function checkCurrentPermissions(): Promise<SystemPermissionsStatus> {
  const status: SystemPermissionsStatus = {
    microphone: 'prompt',
    location: 'prompt',
  };

  // Check Permissions API if available
  if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
    try {
      // Check microphone
      const micStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      status.microphone = micStatus.state;
    } catch {
      // Some browsers (like Safari) don't support querying 'microphone' via Permissions API
      status.microphone = 'prompt';
    }

    try {
      // Check geolocation
      const locStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      status.location = locStatus.state;
    } catch {
      status.location = 'prompt';
    }
  }

  return status;
}

/**
 * Trigger native browser prompt for Microphone access
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('getUserMedia is not supported on this browser.');
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop temporary tracks immediately so the microphone indicator doesn't stay permanently locked
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch (err) {
    console.warn('Microphone permission dismissed or denied:', err);
    return false;
  }
}

/**
 * Trigger native browser prompt for Location access
 */
export async function requestLocationAccess(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    console.warn('Geolocation is not supported on this browser.');
    return false;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(
            'thruv_last_coords',
            JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              updatedAt: Date.now(),
            })
          );
        } catch {
          // ignore storage error
        }
        resolve(true);
      },
      (err) => {
        console.warn('Geolocation permission dismissed or denied:', err.message);
        resolve(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
}

/**
 * Trigger sequentially so the browser presents the Microphone dialog,
 * followed by the Location dialog without overlapping or conflicting.
 */
export async function requestRequiredPermissions(
  onProgress?: (stage: 'mic' | 'location' | 'done') => void
): Promise<{ microphoneGranted: boolean; locationGranted: boolean }> {
  onProgress?.('mic');
  const microphoneGranted = await requestMicrophoneAccess();

  onProgress?.('location');
  const locationGranted = await requestLocationAccess();

  onProgress?.('done');
  return { microphoneGranted, locationGranted };
}
