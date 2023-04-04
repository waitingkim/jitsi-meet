import { IReduxState } from '../../app/types';

import { IConfig, IDeeplinkingConfig, IDeeplinkingMobileConfig, IDeeplinkingPlatformConfig } from './configType';
import { TOOLBAR_BUTTONS } from './constants';

export * from './functions.any';

/**
 * Removes all analytics related options from the given configuration, in case of a libre build.
 *
 * @param {*} _config - The configuration which needs to be cleaned up.
 * @returns {void}
 */
export function _cleanupConfig(_config: IConfig) {
    return;
}

/**
 * Returns the replaceParticipant config.
 *
 * @param {Object} state - The state of the app.
 * @returns {boolean}
 */
export function getReplaceParticipant(state: IReduxState): string | undefined {
    return state['features/base/config'].replaceParticipant;
}

/**
 * Returns the list of enabled toolbar buttons.
 *
 * @param {Object} state - The redux state.
 * @returns {Array<string>} - The list of enabled toolbar buttons.
 */
export function getToolbarButtons(state: IReduxState): Array<string> {
    const { toolbarButtons, customToolbarButtons } = state['features/base/config'];
    const customButtons = customToolbarButtons?.map(({ id }) => id);

    const buttons = Array.isArray(toolbarButtons) ? toolbarButtons : TOOLBAR_BUTTONS;

    if (customButtons) {
        buttons.push(...customButtons);
    }

    return buttons;
}

/**
 * Returns the configuration value of web-hid feature.
 *
 * @param {Object} state - The state of the app.
 * @returns {boolean} True if web-hid feature should be enabled, otherwise false.
 */
export function getWebHIDFeatureConfig(state: IReduxState): boolean {
    return state['features/base/config'].enableWebHIDFeature || false;
}

/**
 * Checks if the specified button is enabled.
 *
 * @param {string} buttonName - The name of the button.
 * {@link interfaceConfig}.
 * @param {Object|Array<string>} state - The redux state or the array with the enabled buttons.
 * @returns {boolean} - True if the button is enabled and false otherwise.
 */
export function isToolbarButtonEnabled(buttonName: string, state: IReduxState | Array<string>) {
    const buttons = Array.isArray(state) ? state : getToolbarButtons(state);

    return buttons.includes(buttonName);
}

/**
 * Returns whether audio level measurement is enabled or not.
 *
 * @param {Object} state - The state of the app.
 * @returns {boolean}
 */
export function areAudioLevelsEnabled(state: IReduxState): boolean {
    // Default to false for React Native as audio levels are of no interest to the mobile app.
    return navigator.product !== 'ReactNative' && !state['features/base/config'].disableAudioLevels;
}

/**
 * Sets the defaults for deeplinking.
 *
 * @param {IDeeplinkingConfig} deeplinking - The deeplinking config.
 * @returns {void}
 */
export function _setDeeplinkingDefaults(deeplinking: IDeeplinkingConfig) {
    const {
        desktop = {} as IDeeplinkingPlatformConfig,
        android = {} as IDeeplinkingMobileConfig,
        ios = {} as IDeeplinkingMobileConfig
    } = deeplinking;

    desktop.appName = desktop.appName || 'GLEP Meet';

    ios.appName = ios.appName || 'GLEP Meet';
    ios.appScheme = ios.appScheme || 'liveedu.meet.castis.io';
    ios.downloadLink = ios.downloadLink
        || 'https://liveedu.meet.castis.io';
    if (ios.dynamicLink) {
        ios.dynamicLink.apn = ios.dynamicLink.apn || 'liveedu.meet.castis.io';
        ios.dynamicLink.appCode = ios.dynamicLink.appCode || 'w2atb';
        ios.dynamicLink.ibi = ios.dynamicLink.ibi || 'com.atlassian.JitsiMeet.ios';
        ios.dynamicLink.isi = ios.dynamicLink.isi || '1165103905';
    }

    android.appName = android.appName || 'GLEP Meet';
    android.appScheme = android.appScheme || 'liveedu.meet.castis.io';
    android.downloadLink = android.downloadLink
        || 'https://liveedu.meet.castis.io';
    android.appPackage = android.appPackage || 'liveedu.meet.castis.io';
    android.fDroidUrl = android.fDroidUrl || 'https://f-droid.org/en/packages/org.jitsi.meet/';
    if (android.dynamicLink) {
        android.dynamicLink.apn = android.dynamicLink.apn || 'liveedu.meet.castis.io';
        android.dynamicLink.appCode = android.dynamicLink.appCode || 'w2atb';
        android.dynamicLink.ibi = android.dynamicLink.ibi || 'https://liveedu.meet.castis.io';
        android.dynamicLink.isi = android.dynamicLink.isi || '1165103905';
    }
}

/**
 * Returns the list of buttons that have that notify the api when clicked.
 *
 * @param {Object} state - The redux state.
 * @returns {Array} - The list of buttons.
 */
export function getButtonsWithNotifyClick(state: IReduxState): Array<{ key: string; preventExecution: boolean; }> {
    const { buttonsWithNotifyClick, customToolbarButtons } = state['features/base/config'];
    const customButtons = customToolbarButtons?.map(({ id }) => {
        return {
            key: id,
            preventExecution: false
        };
    });

    const buttons = Array.isArray(buttonsWithNotifyClick)
        ? buttonsWithNotifyClick as Array<{ key: string; preventExecution: boolean; }>
        : [];

    if (customButtons) {
        buttons.push(...customButtons);
    }

    return buttons;
}

