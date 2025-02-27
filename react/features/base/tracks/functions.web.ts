import { IStore } from '../../app/types';
import { IStateful } from '../app/types';
import { isMobileBrowser } from '../environment/utils';
import JitsiMeetJS from '../lib-jitsi-meet';
import { setAudioMuted } from '../media/actions';
import { toState } from '../redux/functions';
import {
    getUserCameraDevices, getUserSecondCameraDeviceId,
    getUserSelectedCameraDeviceId,
    getUserSelectedMicDeviceId, isAloneSelectedCamera
} from '../settings/functions.web'

import loadEffects from './loadEffects';
import logger from './logger';
import { ITrackOptions } from './types';

export * from './functions.any';

/**
 * Create local tracks of specific types.
 *
 * @param {Object} options - The options with which the local tracks are to be
 * created.
 * @param {string|null} [options.cameraDeviceId] - Camera device id or
 * {@code undefined} to use app's settings.
 * @param {string[]} options.devices - Required track types such as 'audio'
 * and/or 'video'.
 * @param {string|null} [options.micDeviceId] - Microphone device id or
 * {@code undefined} to use app's settings.
 * @param {number|undefined} [oprions.timeout] - A timeout for JitsiMeetJS.createLocalTracks used to create the tracks.
 * @param {boolean} [options.firePermissionPromptIsShownEvent] - Whether lib-jitsi-meet
 * should check for a {@code getUserMedia} permission prompt and fire a
 * corresponding event.
 * @param {IStore} store - The redux store in the context of which the function
 * is to execute and from which state such as {@code config} is to be retrieved.
 * @returns {Promise<JitsiLocalTrack[]>}
 */
export function createLocalTracksF(options: ITrackOptions = {}, store?: IStore) {
    let { cameraDeviceId, micDeviceId } = options;
    const {
        desktopSharingSourceDevice,
        desktopSharingSources,
        firePermissionPromptIsShownEvent,
        timeout
    } = options;

    // TODO The app's settings should go in the redux store and then the
    // reliance on the global variable APP will go away.
    store = store || APP.store; // eslint-disable-line no-param-reassign

    const state = store.getState();
    const isAlone = isAloneSelectedCamera(state)
    const cameraDevices = getUserCameraDevices(state);
    console.log('[castis] createLocalTracksF cameraDevices ', cameraDevices)
    console.log('[castis] createLocalTracksF state ', state)

    // videoInput?: MediaDeviceInfo[];
    if (typeof cameraDeviceId === 'undefined' || cameraDeviceId === null) {
        cameraDeviceId = getUserSelectedCameraDeviceId(state);
    }

    if (typeof micDeviceId === 'undefined' || micDeviceId === null) {
        micDeviceId = getUserSelectedMicDeviceId(state);
    }

    const {
        desktopSharingFrameRate,
        firefox_fake_device, // eslint-disable-line camelcase
        resolution
    } = state['features/base/config'];
    const constraints = options.constraints ?? state['features/base/config'].constraints;

    //TODO: 선택된 로컬 스트림 리턴
    return (
        loadEffects(store).then((effectsArray: Object[]) => {
            // Filter any undefined values returned by Promise.resolve().
            const effects = effectsArray.filter(effect => Boolean(effect));
            console.log('[castis] cameraDeviceId cameraDeviceId ', cameraDeviceId)
            if(cameraDevices) {
                if (cameraDeviceId === undefined && cameraDevices.length > 0) {
                    cameraDeviceId = cameraDevices[0].deviceId
                }
            }

            return JitsiMeetJS.createLocalTracks(
                {
                    cameraDeviceId,
                    constraints,
                    desktopSharingFrameRate,
                    desktopSharingSourceDevice,
                    desktopSharingSources,

                    // Copy array to avoid mutations inside library.
                    devices: options.devices?.slice(0),
                    effects,
                    firefox_fake_device, // eslint-disable-line camelcase
                    firePermissionPromptIsShownEvent,
                    micDeviceId,
                    resolution,
                    timeout
                }).then(( tracks: any ) => {
                console.log('[castis] cameraDeviceId then secondLocalTracks1 isAlone :' + isAlone, tracks)
                    for (const tracksKey in tracks) {
                        tracks[tracksKey].isMaster = true
                    }

                    if(isAlone) {
                        // for (const tracksKey in tracks) {
                        //     tracks[tracksKey].isMaster = true
                        // }
                        return tracks
                    } else {
                        // VIDOE track 가져와서 id를 넣어 줘야 함.
                        if(cameraDeviceId) {
                            cameraDeviceId = getUserSecondCameraDeviceId(state, cameraDeviceId)
                            console.log('[castis] cameraDeviceId then getUserSecondCameraDeviceId(state)', cameraDeviceId)
                        }

                        return JitsiMeetJS.createLocalTracks({
                            cameraDeviceId,
                            constraints,
                            desktopSharingFrameRate,
                            desktopSharingSourceDevice,
                            desktopSharingSources,

                            // Copy array to avoid mutations inside library.
                            devices: ['video'],
                            effects,
                            firefox_fake_device, // eslint-disable-line camelcase
                            firePermissionPromptIsShownEvent,
                            micDeviceId,
                            resolution,
                            timeout
                        }).then((track:any) => {
                            console.log('[castis] cameraDeviceId then secondLocalTracks2 ', track)
                            for (const tracksKey in track) {
                                track[tracksKey].isMaster = false
                            }
                            // tracks.map(track => {
                            //     return Promise.resolve();
                            // });
                            // tracks[0].isMaster = true
                            // tracks[1].isMaster = true
                            return [tracks[0], tracks[1], track[0]]
                        })
                    }

                }
            ).catch((err: Error) => {
                logger.error('Failed to create local tracks', options.devices, err);
                return Promise.reject(err);
            });

            // let a = localTracks.then(tracks => {
            //     return tracks
            // }).then(tracks => {
            //     console.log('[castis] cameraDeviceId tracks!!! ', tracks)
            //     return secondLocalTracks.then(track => {
            //         return Promise.resolve(tracks.push(track[0]))
            //     })
            // })
            // console.log('[castis] cameraDeviceId resultlocalTracks ', secondLocalTracks)
            // return secondLocalTracks
        }));
}

async function createLocalTracks() {

}

/**
 * Returns an object containing a promise which resolves with the created tracks &
 * the errors resulting from that process.
 *
 * @returns {Promise<JitsiLocalTrack>}
 *
 * @todo Refactor to not use APP.
 */
export function createPrejoinTracks() {
    const errors: any = {};
    const initialDevices = [ 'audio' ];
    const requestedAudio = true;
    let requestedVideo = false;
    const { startAudioOnly, startWithAudioMuted, startWithVideoMuted } = APP.store.getState()['features/base/settings'];

    // Always get a handle on the audio input device so that we have statistics even if the user joins the
    // conference muted. Previous implementation would only acquire the handle when the user first unmuted,
    // which would results in statistics ( such as "No audio input" or "Are you trying to speak?") being available
    // only after that point.
    if (startWithAudioMuted) {
        APP.store.dispatch(setAudioMuted(true));
    }

    if (!startWithVideoMuted && !startAudioOnly) {
        initialDevices.push('video');
        requestedVideo = true;
    }

    let tryCreateLocalTracks;

    if (!requestedAudio && !requestedVideo) {
        // Resolve with no tracks
        tryCreateLocalTracks = Promise.resolve([]);
    } else {
        tryCreateLocalTracks = createLocalTracksF({
            devices: initialDevices,
            firePermissionPromptIsShownEvent: true
        }, APP.store)
                .catch((err: Error) => {
                    if (requestedAudio && requestedVideo) {

                        // Try audio only...
                        errors.audioAndVideoError = err;

                        return (
                            createLocalTracksF({
                                devices: [ 'audio' ],
                                firePermissionPromptIsShownEvent: true
                            }));
                    } else if (requestedAudio && !requestedVideo) {
                        errors.audioOnlyError = err;

                        return [];
                    } else if (requestedVideo && !requestedAudio) {
                        errors.videoOnlyError = err;

                        return [];
                    }
                    logger.error('Should never happen');
                })
                .catch((err: Error) => {
                    // Log this just in case...
                    if (!requestedAudio) {
                        logger.error('The impossible just happened', err);
                    }
                    errors.audioOnlyError = err;

                    // Try video only...
                    return requestedVideo
                        ? createLocalTracksF({
                            devices: [ 'video' ],
                            firePermissionPromptIsShownEvent: true
                        })
                        : [];
                })
                .catch((err: Error) => {
                    // Log this just in case...
                    if (!requestedVideo) {
                        logger.error('The impossible just happened', err);
                    }
                    errors.videoOnlyError = err;

                    return [];
                });
    }

    return {
        tryCreateLocalTracks,
        errors
    };
}

/**
 * Determines whether toggle camera should be enabled or not.
 *
 * @param {Function|Object} stateful - The redux store or {@code getState} function.
 * @returns {boolean} - Whether toggle camera should be enabled.
 */
export function isToggleCameraEnabled(stateful: IStateful) {
    const state = toState(stateful);
    const { videoInput } = state['features/base/devices'].availableDevices;

    return isMobileBrowser() && Number(videoInput?.length) > 1;
}
