// @flow

import React, { useEffect } from 'react';
import { connect } from 'react-redux';

import { getDisplayName } from '../../../../base/settings';
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
    const { _participantId, flipVideo, name, videoMuted, videoTrack, isMaster } = props;
    const className = flipVideo ? 'flipVideoX' : '';

    useEffect(() => {
        APP.API.notifyPrejoinVideoVisibilityChanged(Boolean(!videoMuted && videoTrack));
    }, [ videoMuted, videoTrack ]);

    useEffect(() => {
        APP.API.notifyPrejoinLoaded();

        return () => APP.API.notifyPrejoinVideoVisibilityChanged(false);
    }, []);

    console.log('[castis] Preview videoTrack ', videoTrack)
    return (
        <div id = 'preview' style={isMaster?{width:'40%'}:{alignItems:'end'}}>
            {!videoMuted && videoTrack
                ? (
                    <Video
                        style={isMaster?{height:'30%', borderRadius:'24px', marginTop:'5%', width:'90%'}:{borderRadius:'24px', marginBottom:'2%', marginRight:'5%', height: '63%'}}
                        className = { className }
                        id = 'prejoinVideo'
                        videoTrack = {{ jitsiTrack: videoTrack }} />
                )
                : (
                    <Avatar
                        className = 'premeeting-screen-avatar'
                        displayName = { name }
                        participantId = { _participantId }
                        size = { 200 } />
                )}
        </div>
    );
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
        name,
        videoMuted: ownProps.videoTrack ? ownProps.videoMuted : state['features/base/media'].video.muted,
        videoTrack: ownProps.videoTrack || (getLocalVideoTrack(state['features/base/tracks']) || {}).jitsiTrack
    };
}

export default connect(_mapStateToProps)(Preview);
