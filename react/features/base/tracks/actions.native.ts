import { IReduxState, IStore } from '../../app/types';
// eslint-disable-next-line lines-around-comment
// @ts-ignore
import { setPictureInPictureEnabled } from '../../mobile/picture-in-picture/functions';
import { showNotification } from '../../notifications/actions';
import { NOTIFICATION_TIMEOUT_TYPE } from '../../notifications/constants';
import JitsiMeetJS from '../lib-jitsi-meet';
import {
    setScreenshareMuted,
    setVideoMuted
} from '../media/actions';
import { VIDEO_MUTISM_AUTHORITY } from '../media/constants';

import { addLocalTrack, replaceLocalTrack } from './actions.any';
import { getLocalDesktopTrack, getTrackState, isLocalVideoTrackDesktop } from './functions.native';

export * from './actions.any';

/* eslint-disable @typescript-eslint/no-unused-vars */

/**
 * Signals that the local participant is ending screensharing or beginning the screensharing flow.
 *
 * @param {boolean} enabled - The state to toggle screen sharing to.
 * @param {boolean} _ignore1 - Ignored.
 * @param {any} _ignore2 - Ignored.
 * @returns {Function}
 */
export function toggleScreensharing(enabled: boolean, _ignore1?: boolean, _ignore2?: any) {
    return (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState();

        if (enabled) {
            const isSharing = isLocalVideoTrackDesktop(state);

            if (!isSharing) {
                _startScreenSharing(dispatch, state);
            }
        } else {
            dispatch(setScreenshareMuted(true));
            dispatch(setVideoMuted(false, VIDEO_MUTISM_AUTHORITY.SCREEN_SHARE));
            setPictureInPictureEnabled(true);
        }
    };
}

/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Creates desktop track and replaces the local one.
 *
 * @private
 * @param {Dispatch} dispatch - The redux {@code dispatch} function.
 * @param {Object} state - The redux state.
 * @returns {void}
 */
async function _startScreenSharing(dispatch: Function, state: IReduxState) {
    setPictureInPictureEnabled(false);

    try {
        const tracks: any[] = await JitsiMeetJS.createLocalTracks({ devices: [ 'desktop' ] });
        const track = tracks[0];
        const currentLocalDesktopTrack = getLocalDesktopTrack(getTrackState(state));
        const currentJitsiTrack = currentLocalDesktopTrack?.jitsiTrack;

        // The first time the user shares the screen we add the track and create the transceiver.
        // Afterwards, we just replace the old track, so the transceiver will be reused.
        // 교체를 하지 않고, 추가만 하는 방향: 현재 보는 화면을 교체 하지 않고, 특정 뷰에서만 노출 하도록 처리 하기 위해
        // if (currentJitsiTrack) {
        //     dispatch(replaceLocalTrack(currentJitsiTrack, track));
        // } else {
            dispatch(addLocalTrack(track));
        // }

        dispatch(setVideoMuted(true, VIDEO_MUTISM_AUTHORITY.SCREEN_SHARE));

        const { enabled: audioOnly } = state['features/base/audio-only'];

        if (audioOnly) {
            dispatch(showNotification({
                titleKey: 'notify.screenSharingAudioOnlyTitle',
                descriptionKey: 'notify.screenSharingAudioOnlyDescription',
                maxLines: 3
            }, NOTIFICATION_TIMEOUT_TYPE.LONG));
        }
    } catch (error: any) {
        console.log('ERROR creating ScreeSharing stream ', error);

        setPictureInPictureEnabled(true);
    }
}
