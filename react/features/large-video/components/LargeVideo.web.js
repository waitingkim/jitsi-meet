// @flow

import $ from 'jquery';
import React, { Component, useCallback, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';

import VideoLayout from '../../../../modules/UI/videolayout/VideoLayout';
import { VIDEO_TYPE } from '../../base/media';
import { getLocalParticipant } from '../../base/participants';
import { Watermarks } from '../../base/react';
import { updateSettings } from '../../base/settings';
import { getHideSelfView } from '../../base/settings/functions.any';
import { getVideoTrackByParticipant } from '../../base/tracks';
import { setColorAlpha } from '../../base/util';
import { StageParticipantNameLabel } from '../../display-name';
import { FILMSTRIP_BREAKPOINT, isFilmstripResizable } from '../../filmstrip';
import { getVerticalViewMaxWidth } from '../../filmstrip/functions.web';
import { getLargeVideoParticipant } from '../../large-video/functions';
import { SharedVideo } from '../../shared-video/components/web';
import { updateStats } from '../../speaker-stats/actions.any';
import { Captions } from '../../subtitles/';
import { setTileView } from '../../video-layout/actions';
import Whiteboard from '../../whiteboard/components/web/Whiteboard';
import { isWhiteboardEnabled } from '../../whiteboard/functions';
import { setSeeWhatIsBeingShared } from '../actions.web';

import ScreenSharePlaceholder from './ScreenSharePlaceholder.web';

// Hack to detect Spot.
const SPOT_DISPLAY_NAME = 'Meeting Room';

declare var interfaceConfig: Object;

type Props = {

    /**
     * The alpha(opacity) of the background.
     */
    _backgroundAlpha: number,

    /**
     * The user selected background color.
     */
    _customBackgroundColor: string,

    /**
     * The user selected background image url.
     */
    _customBackgroundImageUrl: string,

    /**
     * Whether the screen-sharing placeholder should be displayed or not.
     */
    _displayScreenSharingPlaceholder: boolean,

    /**
     * Prop that indicates whether the chat is open.
     */
    _isChatOpen: boolean,

    /**
     * Used to determine the value of the autoplay attribute of the underlying
     * video element.
     */
    _noAutoPlayVideo: boolean,

    /**
     * Whether or not the filmstrip is resizable.
     */
    _resizableFilmstrip: boolean,

    /**
     * Whether or not to show dominant speaker badge.
     */
    _showDominantSpeakerBadge: boolean,

    /**
     * The width of the vertical filmstrip (user resized).
     */
    _verticalFilmstripWidth: ?number,

    /**
     * The max width of the vertical filmstrip.
     */
    _verticalViewMaxWidth: number,

    /**
     * Whether or not the filmstrip is visible.
     */
    _visibleFilmstrip: boolean,

    /**
     * The large video participant id.
     */
    _largeVideoParticipantId: string,

    /**
     * Whether or not the local screen share is on large-video.
     */
    _isScreenSharing: boolean,

    /**
     * Whether or not the screen sharing is visible.
     */
    _seeWhatIsBeingShared: boolean,

    /**
     * Whether or not the whiteboard is enabled.
     */
    _whiteboardEnabled: boolean;

     /**
     * Whether or not the hideSelfView is enabled.
     */
    _hideSelfView: boolean;

    /**
     * Local Participant id.
     */
    _localParticipantId: string;

    /**
     * The Redux dispatch function.
     */
    dispatch: Function;

    _roomLocalMainFlip: string;
    _roomLocalSubFlip: string;
    _roomRemoteMainFlip: string;
    _roomRemoteSubFlip: string;
}

/** .
 * Implements a React {@link Component} which represents the large video (a.k.a.
 * The conference participant who is on the local stage) on Web/React.
 *
 * @augments Component
 */
class LargeVideo extends Component<Props> {
    _tappedTimeout: ?TimeoutID;

    _containerRef: Object;

    _wrapperRef: Object;

    /**
     * Constructor of the component.
     *
     * @inheritdoc
     */
    constructor(props) {
        super(props);

        this._containerRef = React.createRef();
        this._wrapperRef = React.createRef();

        this._clearTapTimeout = this._clearTapTimeout.bind(this);
        this._onDoubleTap = this._onDoubleTap.bind(this);
        this._updateLayout = this._updateLayout.bind(this);
        this.isLocalChangeMain =  APP.store.getState()['features/base/settings'].localChangeView;
        this.isRemoteChangeView =  APP.store.getState()['features/base/settings'].remoteChangeView;
    }

    /**
     * Implements {@code Component#componentDidUpdate}.
     *
     * @inheritdoc
     */
    componentDidUpdate(prevProps: Props) {
        const {
            _visibleFilmstrip,
            _isScreenSharing,
            _seeWhatIsBeingShared,
            _largeVideoParticipantId,
            _hideSelfView,
            _localParticipantId,
            _localChangeView,
            _remoteChangeView} = this.props;

        console.log('[castis] this.isLocalChangeMain  ', this.isLocalChangeMain )
        console.log('[castis] _localChangeView ', _localChangeView)

        if (prevProps._visibleFilmstrip !== _visibleFilmstrip) {
            this._updateLayout();
        }

        if (prevProps._isScreenSharing !== _isScreenSharing && !_isScreenSharing) {
            this.props.dispatch(setSeeWhatIsBeingShared(false));
        }

        if (_isScreenSharing && _seeWhatIsBeingShared) {
            VideoLayout.updateLargeVideo(_largeVideoParticipantId, true, true);
        }

        if (_largeVideoParticipantId === _localParticipantId
            && prevProps._hideSelfView !== _hideSelfView) {
            VideoLayout.updateLargeVideo(_largeVideoParticipantId, true, false);
        }

        if(this.isLocalChangeMain !== _localChangeView) {
            this.isLocalChangeMain = _localChangeView;
            VideoLayout.changeViewByLocal(_largeVideoParticipantId, _localChangeView, _remoteChangeView)
        }
        if(this.isRemoteChangeView !== _remoteChangeView) {
            this.isRemoteChangeView = _remoteChangeView;
            VideoLayout.changeViewByLocal(_largeVideoParticipantId, _localChangeView, _remoteChangeView)
        }

    }

    /**
     * Implements React's {@link Component#render()}.
     *
     * @inheritdoc
     * @returns {React$Element}
     */
    render() {
        const {
            _displayScreenSharingPlaceholder,
            _isChatOpen,
            _noAutoPlayVideo,
            _showDominantSpeakerBadge,
            _whiteboardEnabled,
            _roomLocalMainFlip,
            _roomLocalSubFlip,
            _roomRemoteMainFlip,
            _roomRemoteSubFlip,
            _localChangeView,
            _remoteChangeView
        } = this.props;
        const style = this._getCustomStyles();
        const className = `videocontainer${_isChatOpen ? ' shift-right' : ''}`;
        const viewStyles = [
            { // MODE 1
                local:{
                    div: { width: '50%', height:'100%' },
                    line: {},
                    video:[
                        {borderRadius:'24px', width:'95%'},
                        {borderRadius:'24px', width:'48%', marginTop:'2%'}
                    ]
                },
                remote:{
                    div: { width: '50%', height:'100%' },
                    line: {},
                    video:[
                        {borderRadius:'24px', width:'48%', backgroundColor:'#292B2C'},
                        {borderRadius:'24px', width:'95%', marginTop:'2%', backgroundColor:'#292B2C'}
                    ]
                }
            },
            { // MODE 2
                local:{
                    div: { width: '50%', height:'100%' },
                    line: {},
                    video:[
                        {borderRadius:'24px', width:'95%'},
                        {borderRadius:'24px', width:'48%', marginTop:'2%', visibility: 'hidden'}
                    ]
                },
                remote:{
                    div: { width: '50%', height:'100%' },
                    line: {},
                    video:[
                        {borderRadius:'24px', width:'48%'},
                        {borderRadius:'24px', width:'95%', marginTop:'2%'}
                    ]
                }
            },
            { // MODE 3
                local:{
                    div: { width: '0%', visibility: 'hidden' },
                    line: {},
                    video:[
                        {borderRadius:'24px', width:'48%'},
                        {borderRadius:'24px', width:'95%', marginTop:'2%'}
                    ]
                },
                remote:{
                    div: {display:'flex', height:'100%'},
                    line: {width:'40%'},
                    video:[
                        {borderRadius:'24px', width:'90%'},
                        {borderRadius:'24px', height:'25%', marginTop:'15%'}
                    ]
                }
            }
        ]
        let selectStyle = viewStyles[0]

        function onChangeFlip(className) {
            console.log('[castis] onChangeFlip event ', className)
            let newClassName;
            switch (className) {
            case 'video flipVideoY0':
                newClassName = 'video flipVideoY90';
                break;
            case 'video flipVideoY90':
                newClassName = 'video flipVideoY180';
                break;
            case 'video flipVideoY180':
                newClassName = 'video flipVideoY270';
                break;
            default:
                newClassName = 'video flipVideoY0';
                break;
            }
            return newClassName;
        }

        const onChangeViewLocalMain = (event) => {
            console.log('[castis] onChangeViewLocalMain event ', event)
            APP.store.dispatch(updateSettings({
                localChangeView: !_localChangeView
            }));
        }

        const onChangeViewRemoteMain = (event) => {
            console.log('[castis] onChangeViewLocalMain event ', event)
            APP.store.dispatch(updateSettings({
                remoteChangeView: !_remoteChangeView
            }));
        }

        const onClickByLocalMain = (event) => {
            console.log('[castis] onClickByLocalMain event ', event)
            APP.store.dispatch(updateSettings({
                roomLocalMainFlip: onChangeFlip(_roomLocalMainFlip)
            }));
        }
        const onClickByLocalSub = (event) => {
            console.log('[castis] onClickByLocalSub event ', event)
            APP.store.dispatch(updateSettings({
                roomLocalSubFlip: onChangeFlip(_roomLocalSubFlip)
            }));
        }
        const onClickByRemoteMain = (event) => {
            console.log('[castis] onClickByRemoteMain event ', event)
            APP.store.dispatch(updateSettings({
                roomRemoteMainFlip: onChangeFlip(_roomRemoteMainFlip)
            }));
        }

        const onClickByRemoteSub = (event) => {
            console.log('[castis] onClickByRemoteSub event ', event)
            APP.store.dispatch(updateSettings({
                roomRemoteSubFlip: onChangeFlip(_roomRemoteSubFlip)
            }));
        }

        return (
            <div
                className = { className }
                id = 'largeVideoContainer'
                ref = { this._containerRef }
                style = { style }>
                <SharedVideo />
                {_whiteboardEnabled && <Whiteboard />}
                <div id = 'etherpad' />

                <Watermarks />

                <div
                    id = 'dominantSpeaker'
                    onTouchEnd = { this._onDoubleTap }>
                    <div className = 'dynamic-shadow' />
                    <div id = 'dominantSpeakerAvatarContainer' />
                </div>
                <div id = 'remotePresenceMessage' />
                <span id = 'remoteConnectionMessage' />
                <div id = 'largeVideoElementsContainer'>
                    <div id = 'largeVideoBackgroundContainer' style={{visibility:'hidden'}} />
                    {/*
                      * FIXME: the architecture of elements related to the large
                      * video and the naming. The background is not part of
                      * largeVideoWrapper because we are controlling the size of
                      * the video through largeVideoWrapper. That's why we need
                      * another container for the background and the
                      * largeVideoWrapper in order to hide/show them.
                      */}
                    <div
                        id = 'largeVideoWrapper'
                        onTouchEnd = { this._onDoubleTap }
                        style={{backgroundColor:'#13171B'}}
                        ref = { this._wrapperRef }
                        role = 'figure' >
                        { _displayScreenSharingPlaceholder ? <ScreenSharePlaceholder /> :
                            <div>
                                <div id={'room_head_buttons'} style={{height:'80px', width:'100%', position:'absolute', top:'0px', backgroundColor:'#2D2D2D'}}>
                                    <span style={{position:'absolute', top:'0px', left:'14px', backgroundColor:'transparent'}}>
                                        <img style={{width:'76px', height:'76px'}} src={'images/logo_ans.png'} alt={'Logo'}/>
                                    </span>

                                    <div onClick={(e)=>{this.onChangeView({num:'0'}, e)}} className={'room_head_button_bg'} style={{
                                        boxSizing: 'border-box',
                                        width: '48px',
                                        height: '36px',
                                        left: '0px',
                                        top: '2px',
                                        border: '1px solid #FFFFFF',
                                        borderRadius: '6px',
                                        float: 'right',
                                        marginTop: '22px',
                                        marginRight: '20px',
                                        position: 'relative'}}>
                                        <div className={'room_head_button'} style={{
                                            width: '10.87px',
                                            height: '8.1px',
                                            left: '5.25px',
                                            top: '8.25px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '24.02px',
                                            height: '13.5px',
                                            left: '18.5px',
                                            top: '12.25px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                    </div>
                                    <div onClick={(e)=>{this.onChangeView({num:'1'}, e)}} className={'room_head_button_bg'} style={{
                                        boxSizing: 'border-box',
                                        width: '48px',
                                        height: '36px',
                                        left: '0px',
                                        top: '2px',
                                        border: '1px solid #FFFFFF',
                                        borderRadius: '6px',
                                        float: 'right',
                                        marginTop: '22px',
                                        marginRight: '16px',
                                        position: 'relative'}}>
                                        <div className={'room_head_button'} style={{
                                            width: '19.02px',
                                            height: '10.8px',
                                            left: '6.25px',
                                            top: '5.3px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '10.87px',
                                            height: '8.1px',
                                            left: '29.34px',
                                            top: '5.3px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '19.02px',
                                            height: '10.8px',
                                            left: '22.19px',
                                            top: '18.45px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                    </div>
                                    <div onClick={(e)=>{this.onChangeView({num:'2'}, e)}} className={'room_head_button_bg active'} style={{
                                        boxSizing: 'border-box',
                                        width: '48px',
                                        height: '36px',
                                        left: '0px',
                                        top: '2px',
                                        border: '1px solid #FFFFFF',
                                        borderRadius: '6px',
                                        float: 'right',
                                        marginTop: '22px',
                                        marginRight: '16px',
                                        position: 'relative'}}>
                                        <div className={'room_head_button'} style={{
                                            width: '19.02px',
                                            height: '10.8px',
                                            left: '6.25px',
                                            top: '5.3px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '10.87px',
                                            height: '8.1px',
                                            left: '29.34px',
                                            top: '5.3px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '10.87px',
                                            height: '8.1px',
                                            left: '6.25px',
                                            top: '21.15px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                        <div className={'room_head_button'} style={{
                                            width: '19.02px',
                                            height: '10.8px',
                                            left: '22.19px',
                                            top: '18.45px',
                                            borderRadius: '2px',
                                            position: 'absolute'
                                        }}/>
                                    </div>
                                </div>
                                <div id={'videoScreen'} style={{marginTop:'95px', display: 'flex', alignItems: 'center', height:'100%'}}>
                                    <div className={'room_local_2'}>
                                        <div className={'main'} style={{width:'100%'}}>
                                            <div
                                                className={'toolbox-icon rotate_0'}
                                                onClick = { onClickByLocalMain }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '46%',
                                                    marginTop: '10px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                            }}
                                            >
                                                <img src={'images/rotate_right_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <div
                                                className={'toolbox-icon rotate_0'}
                                                onClick = { onChangeViewLocalMain }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '43.5%',
                                                    marginTop: '10px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                                }}
                                            >
                                                <img src={'images/baseline_wifi_protected_setup_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <video
                                                className={_roomLocalMainFlip}
                                                autoPlay = { !_noAutoPlayVideo }
                                                id = 'largeVideo'
                                                muted = { true }
                                                playsInline = { true } /* for Safari on iOS to work */
                                            />
                                        </div>
                                        <div className={'sub'}>
                                            <div
                                                className={'toolbox-icon rotate_1'}
                                                onClick = { onClickByLocalSub }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '35%',
                                                    marginTop: '25px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                                }}
                                            >
                                                <img src={'images/rotate_right_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <video
                                                className={_roomLocalSubFlip}
                                                autoPlay = { !_noAutoPlayVideo }
                                                id = 'secondVideo'
                                                muted = { true }
                                                playsInline = { true } /* for Safari on iOS to work */
                                            />
                                        </div>
                                    </div>
                                    <div className={'room_remote_2'}>
                                        <div className={'main'}>
                                            <div
                                                className={'toolbox-icon rotate_2'}
                                                onClick = { onClickByRemoteMain }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '34%',
                                                    marginTop: '10px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                                }}
                                            >
                                                <img src={'images/rotate_right_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <video
                                                className={_roomRemoteMainFlip}
                                                autoPlay = { !_noAutoPlayVideo }
                                                id = 'remoteFaceVideo'
                                                muted = { true }
                                                playsInline = { true } /* for Safari on iOS to work */
                                            />
                                        </div>
                                        <div className={'sub'}>
                                            <div
                                                className={'toolbox-icon rotate_3'}
                                                onClick = { onClickByRemoteSub }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '46%',
                                                    marginTop: '28px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                                }}
                                            >
                                                <img src={'images/rotate_right_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <div
                                                className={'toolbox-icon rotate_3'}
                                                onClick = { onChangeViewRemoteMain }
                                                style={{
                                                    float:'right',
                                                    width:'30px',
                                                    height:'30px',
                                                    marginRight: '49px',
                                                    position: 'absolute',
                                                    marginLeft: '43.5%',
                                                    marginTop: '28px',
                                                    zIndex: '1',
                                                    borderRadius:'24px',
                                                    opacity:'0.7'
                                                }}
                                            >
                                                <img src={'images/baseline_wifi_protected_setup_black_48dp.png'} alt={'Rotate'}/>
                                            </div>
                                            <video
                                                className={_roomRemoteSubFlip}
                                                autoPlay = { !_noAutoPlayVideo }
                                                id = 'remoteDeskVideo'
                                                muted = { true }
                                                playsInline = { true } /* for Safari on iOS to work */
                                            />
                                        </div>

                                    </div>
                                </div>
                            </div>
                        }
                    </div>
                </div>
                { interfaceConfig.DISABLE_TRANSCRIPTION_SUBTITLES
                    || <Captions /> }
                {_showDominantSpeakerBadge && <StageParticipantNameLabel />}
            </div>
        );
    }

    _updateLayout: () => void;

    /**
     * Refreshes the video layout to determine the dimensions of the stage view.
     * If the filmstrip is toggled it adds CSS transition classes and removes them
     * when the transition is done.
     *
     * @returns {void}
     */
    _updateLayout() {
        const { _verticalFilmstripWidth, _resizableFilmstrip } = this.props;

        if (_resizableFilmstrip && _verticalFilmstripWidth >= FILMSTRIP_BREAKPOINT) {
            this._containerRef.current.classList.add('transition');
            this._wrapperRef.current.classList.add('transition');
            VideoLayout.refreshLayout();

            setTimeout(() => {
                this._containerRef.current && this._containerRef.current.classList.remove('transition');
                this._wrapperRef.current && this._wrapperRef.current.classList.remove('transition');
            }, 1000);
        } else {
            VideoLayout.refreshLayout();
        }
    }


    onChangeView(select, event) {
        console.log('[castis] onChangeView event ', event)
        console.log('[castis] onChangeView num ', select)
        const videoScreen = $('#videoScreen');
        const headButtons = $('#room_head_buttons').children('div');
        videoScreen.children('div')[0].className = 'room_local_' + select.num
        videoScreen.children('div')[1].className = 'room_remote_' + select.num
        console.log('[castis] headButtons ', headButtons)
        headButtons[0].className = 'room_head_button_bg'
        headButtons[1].className = 'room_head_button_bg'
        headButtons[2].className = 'room_head_button_bg'
        headButtons[select.num].className = 'room_head_button_bg active'

        const rotate0 = $('.toolbox-icon.rotate_0');
        const rotate1 = $('.toolbox-icon.rotate_1');
        const rotate2 = $('.toolbox-icon.rotate_2');
        const rotate3 = $('.toolbox-icon.rotate_3');

        rotate0[0].style.visibility = 'visible';
        rotate1[0].style.visibility = 'visible';
        rotate2[0].style.visibility = 'visible';
        rotate3[0].style.visibility = 'visible';

        rotate2[0].style.marginLeft = '34%';
        rotate3[0].style.marginTop = '28px';
        rotate3[0].style.marginLeft = '46%';
        rotate3[1].style.marginTop = '28px';
        rotate3[1].style.marginLeft = '43.5%';
        if (select.num === '1') {
            rotate1[0].style.visibility = 'hidden';
        } else if (select.num === '0') {
            rotate0[0].style.visibility = 'hidden';
            rotate1[0].style.visibility = 'hidden';
            rotate2[0].style.marginLeft = '29%';
            rotate3[0].style.marginTop = '11%';
            rotate3[0].style.marginLeft = '60%';
            rotate3[1].style.marginTop = '11%';
            rotate3[1].style.marginLeft = '57.5%';
        }
    }

    _clearTapTimeout: () => void;

    /**
     * Clears the '_tappedTimout'.
     *
     * @private
     * @returns {void}
     */
    _clearTapTimeout() {
        clearTimeout(this._tappedTimeout);
        this._tappedTimeout = undefined;
    }

    /**
     * Creates the custom styles object.
     *
     * @private
     * @returns {Object}
     */
    _getCustomStyles() {
        const styles = {};
        const {
            _customBackgroundColor,
            _customBackgroundImageUrl,
            _verticalFilmstripWidth,
            _verticalViewMaxWidth,
            _visibleFilmstrip
        } = this.props;

        styles.backgroundColor = _customBackgroundColor || interfaceConfig.DEFAULT_BACKGROUND;

        if (this.props._backgroundAlpha !== undefined) {
            const alphaColor = setColorAlpha(styles.backgroundColor, this.props._backgroundAlpha);

            styles.backgroundColor = alphaColor;
        }

        if (_customBackgroundImageUrl) {
            styles.backgroundImage = `url(${_customBackgroundImageUrl})`;
            styles.backgroundSize = 'cover';
        }

        if (_visibleFilmstrip && _verticalFilmstripWidth >= FILMSTRIP_BREAKPOINT) {
            styles.width = `calc(100% - ${_verticalViewMaxWidth || 0}px)`;
        }

        return styles;
    }

    _onDoubleTap: () => void;

    /**
     * Sets view to tile view on double tap.
     *
     * @param {Object} e - The event.
     * @private
     * @returns {void}
     */
    _onDoubleTap(e) {
        e.stopPropagation();
        e.preventDefault();

        if (this._tappedTimeout) {
            this._clearTapTimeout();
            this.props.dispatch(setTileView(true));
        } else {
            this._tappedTimeout = setTimeout(this._clearTapTimeout, 300);
        }
    }
}


/**
 * Maps (parts of) the Redux state to the associated LargeVideo props.
 *
 * @param {Object} state - The Redux state.
 * @private
 * @returns {Props}
 */
function _mapStateToProps(state) {
    const testingConfig = state['features/base/config'].testing;
    const { backgroundColor, backgroundImageUrl } = state['features/dynamic-branding'];
    const { isOpen: isChatOpen } = state['features/chat'];
    const { width: verticalFilmstripWidth, visible } = state['features/filmstrip'];
    const { defaultLocalDisplayName, hideDominantSpeakerBadge } = state['features/base/config'];
    const { seeWhatIsBeingShared } = state['features/large-video'];
    const localParticipantId = getLocalParticipant(state)?.id;
    const largeVideoParticipant = getLargeVideoParticipant(state);
    const videoTrack = getVideoTrackByParticipant(state, largeVideoParticipant);
    const isLocalScreenshareOnLargeVideo = largeVideoParticipant?.id?.includes(localParticipantId)
        && videoTrack?.videoType === VIDEO_TYPE.DESKTOP;
    const isOnSpot = defaultLocalDisplayName === SPOT_DISPLAY_NAME;
    const roomLocalMainFlip = state['features/base/settings'].roomLocalMainFlip;
    const roomLocalSubFlip = state['features/base/settings'].roomLocalSubFlip;
    const roomRemoteMainFlip = state['features/base/settings'].roomRemoteMainFlip;
    const roomRemoteSubFlip = state['features/base/settings'].roomRemoteSubFlip;
    const localChangeView = state['features/base/settings'].localChangeView;
    const remoteChangeView = state['features/base/settings'].remoteChangeView;

    return {
        _backgroundAlpha: state['features/base/config'].backgroundAlpha,
        _customBackgroundColor: backgroundColor,
        _customBackgroundImageUrl: backgroundImageUrl,
        _displayScreenSharingPlaceholder: isLocalScreenshareOnLargeVideo && !seeWhatIsBeingShared && !isOnSpot,
        _hideSelfView: getHideSelfView(state),
        _isChatOpen: isChatOpen,
        _isScreenSharing: isLocalScreenshareOnLargeVideo,
        _largeVideoParticipantId: largeVideoParticipant?.id,
        _localParticipantId: localParticipantId,
        _noAutoPlayVideo: testingConfig?.noAutoPlayVideo,
        _resizableFilmstrip: isFilmstripResizable(state),
        _seeWhatIsBeingShared: seeWhatIsBeingShared,
        _showDominantSpeakerBadge: !hideDominantSpeakerBadge,
        _verticalFilmstripWidth: verticalFilmstripWidth.current,
        _verticalViewMaxWidth: getVerticalViewMaxWidth(state),
        _visibleFilmstrip: visible,
        _whiteboardEnabled: isWhiteboardEnabled(state),
        _roomLocalMainFlip: roomLocalMainFlip,
        _roomLocalSubFlip: roomLocalSubFlip,
        _roomRemoteMainFlip: roomRemoteMainFlip,
        _roomRemoteSubFlip: roomRemoteSubFlip,
        _localChangeView: localChangeView,
        _remoteChangeView: remoteChangeView
    };
}

export default connect(_mapStateToProps)(LargeVideo);
