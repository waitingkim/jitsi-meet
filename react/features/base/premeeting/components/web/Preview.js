// @flow

import React, { useEffect, useMemo } from 'react';
import { connect } from 'react-redux';

import { getDisplayName, updateSettings } from '../../../../base/settings';
import { Avatar } from '../../../avatar';
import { Video } from '../../../media';
import { getLocalParticipant } from '../../../participants';
import { getLocalVideoTrack } from '../../../tracks';

declare var APP: Object;

export type Props = {

    /**
     * Local participant id.
     */
    _participantId: string,

    /**
     * Flag controlling whether the video should be flipped or not.
     */
    flipVideo: boolean,

    flipYVideo: string,

    localMainFlip: string,

    localSubFlip: string,

    /**
     * The name of the user that is about to join.
     */
    name: string,

    /**
     * Flag signaling the visibility of camera preview.
     */
    videoMuted: boolean,

    /**
     * The JitsiLocalTrack to display.
     */
    videoTrack: ?Object,

    isMaster: boolean
};

/**
 * Component showing the video preview and device status.
 *
 * @param {Props} props - The props of the component.
 * @returns {ReactElement}
 */
function Preview(props: Props) {
    const {
        _participantId,
        flipVideo,
        flipYVideo,
        localMainFlip,
        localSubFlip,
        name,
        videoMuted,
        videoTrack,
        isMaster
    } = props;
    const className = isMaster ? localMainFlip : localSubFlip;

    console.log('[castis] Preview flipVideo ', flipVideo + ' / flipYVideo : ' + flipYVideo);
    console.log('[castis] Preview className ', className);
    console.log('[castis] Preview _participantId ', _participantId);

    useEffect(() => {
        APP.API.notifyPrejoinVideoVisibilityChanged(Boolean(!videoMuted && videoTrack));
    }, [ videoMuted, videoTrack ]);

    useEffect(() => {
        APP.API.notifyPrejoinLoaded();
        return () => APP.API.notifyPrejoinVideoVisibilityChanged(false);
    }, []);

    const onClick = (x) => {
        let flip = (flipYVideo === 270) ? 0 : flipYVideo + 90;
        APP.store.dispatch(updateSettings({
            localFlipY: flip
        }));
        if (isMaster) {
            APP.store.dispatch(updateSettings({
                localMainFlip: 'main flipVideoY' + flip
            }));
        } else {
            APP.store.dispatch(updateSettings({
                localSubFlip: 'sub flipVideoY' + flip
            }));
        }
    };

    const mainPreview = useMemo(() => {
        return (<div id="preview"
                     style={{
                         width: '70%',
                         textAlign: 'center'
                     }}>
            {!videoMuted && videoTrack
                ? (
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        marginTop: '5%'
                    }}>
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%'
                        }}>
                            <span style={{
                                height: '30%',
                                borderRadius: '24px',
                                marginTop: '-2%',
                                width: '90%'
                            }}>
                                <div className={'button'} style={
                                    {
                                        position: 'relative',
                                        top: '1%',
                                        width: '93%',
                                        height: '30px',
                                        marginTop: '1%',
                                        zIndex: '1'
                                    }
                                }>
                                </div>
                            </span>
                        </div>
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            opacity: '0.7',
                            display: 'flex'
                        }}>
                            <div
                                className={'toolbox-icon'}
                                style={{
                                    float: 'right',
                                    width: '30px',
                                    height: '30px',
                                    zIndex: '1',
                                    position: 'absolute',
                                    borderRadius:'24px',
                                    marginLeft:'30px'
                                }}
                                onClick={onClick}
                            >
                                <img style={
                                    {
                                        width: '100%',
                                        height: '100%'
                                    }}
                                     src={'images/rotate_right_black_48dp.png'}
                                     alt={'Rotate'}/>
                            </div>
                            <Video
                                style={{
                                    height: '60%',
                                    borderRadius: '24px',
                                    marginTop: '-2%',
                                    width: '90%',
                                    marginLeft:'20px'
                                }}
                                className={className}
                                id="prejoinVideo"
                                videoTrack={{ jitsiTrack: videoTrack }}></Video>
                        </div>
                    </div>
                )
                : (
                    <Avatar
                        className="premeeting-screen-avatar"
                        displayName={name}
                        participantId={_participantId}
                        size={200}/>
                )}
        </div>);
    }, [ videoTrack, flipYVideo ]);

    const deskPreview = useMemo(() => {
        return (<div id="preview"
                     style={{
                         width: '30%',
                         alignItems: 'center'
                     }}>
            {!videoMuted && videoTrack
                ? (
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        marginTop: '0%'
                    }}>
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%'
                        }}>
                            <span style={{
                                height: '30%',
                                borderRadius: '24px',
                                marginTop: '-2%',
                                width: '90%'
                            }}>
                                <span className={'button'} style={
                                    {
                                        position: 'relative',
                                        top: '1%',
                                        width: '93%',
                                        height: '30px',
                                        marginTop: '1%',
                                        zIndex: '1'
                                    }
                                }>
                            </span>
                            </span>
                        </div>
                        <div style={{
                            position: 'absolute',
                            width: '97%',
                            height: '97%',
                            opacity: '0.7',
                            display: 'flex',
                            alignItems: 'end'
                        }}>
                            <div style={{
                                display:'flex',
                                position:'absolute',
                                width:'100%',
                                height:'100%'
                            }}>
                                <div style={{
                                    width:'100%',
                                    height:'69%',
                                    position:"absolute",
                                    alignItems:'end',
                                    display:"flex",
                                    zIndex:"1",
                                }}>
                            <div
                                className={'toolbox-icon'}
                                style={{
                                    float: 'right',
                                    width: '30px',
                                    height: '30px',
                                    opacity:'0.7',
                                    borderRadius:"24px",
                                    marginLeft:"6px"
                                }}
                                onClick={onClick}
                            >
                                <img style={{
                                    width: '100%',
                                    height: '100%'
                                }}
                                     src={'images/rotate_right_black_48dp.png'}
                                     alt={'Rotate'}/>
                            </div>
                            </div>
                            </div>
                            <Video
                                style={{
                                    borderRadius: '24px',
                                    marginBottom: '2%',
                                    marginTop: '-2%',
                                    marginRight: '5%',
                                    height: '33%'
                                }}
                                className={className}
                                id="prejoinVideo"
                                videoTrack={{ jitsiTrack: videoTrack }}></Video>
                        </div>
                    </div>
                )
                : (
                    <Avatar
                        className="premeeting-screen-avatar"
                        displayName={name}
                        participantId={_participantId}
                        size={200}/>
                )}
        </div>);
    }, [ videoTrack, flipYVideo ]);

    return (isMaster ? mainPreview : deskPreview);
}

/**
 * Maps part of the Redux state to the props of this component.
 *
 * @param {Object} state - The Redux state.
 * @param {Props} ownProps - The own props of the component.
 * @returns {Props}
 */
function _mapStateToProps(state, ownProps) {
    const name = getDisplayName(state);
    const { id: _participantId } = getLocalParticipant(state);

    return {
        _participantId,
        flipVideo: state['features/base/settings'].localFlipX,
        flipYVideo: state['features/base/settings'].localFlipY,
        localMainFlip: state['features/base/settings'].localMainFlip,
        localSubFlip: state['features/base/settings'].localSubFlip,
        name,
        videoMuted: ownProps.videoTrack ? ownProps.videoMuted : state['features/base/media'].video.muted,
        videoTrack: ownProps.videoTrack || (getLocalVideoTrack(state['features/base/tracks']) || {}).jitsiTrack
    };
}

export default connect(_mapStateToProps)(Preview);
