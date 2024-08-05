/**
 * Returns `es2020` if the browser supports ES2020 features, `legacy` otherwise.
 *
 * It would be better to detect features, but there's no way to test e.g. if
 * dynamic imports are available in containing apps that may prevent `eval` via
 * their Content-Security-Policy.
 *
 * It's important that we don't mistake a legacy browser as es2020 (since that
 * may cause us to run an incompatible version), but it's okay to mistake an
 * es2020-capable browser and serve them the legacy version.
 *
 * The browser version numbers are based off of caniuse.com data of browsers
 * supporting ALL of the the following features:
 * - https://caniuse.com/es6-module-dynamic-import
 * - https://caniuse.com/mdn-javascript_operators_nullish_coalescing
 * - https://caniuse.com/mdn-javascript_operators_optional_chaining
 * - https://caniuse.com/bigint
 * - https://caniuse.com/mdn-javascript_builtins_promise_allsettled
 * - https://caniuse.com/mdn-javascript_builtins_globalthis
 * - https://caniuse.com/mdn-javascript_builtins_string_matchall
 */
function detectBrowserTarget(agent) {
    var options = [
        // Edge. Can contain "Chrome", so must come before Chrome.
        [/Edg\//, /Edg\/(\d+)/, 80],
        // Opera. Can contain "Chrome", so must come before Chrome
        [/OPR\//, /OPR\/(\d+)/, 67],
        // Chrome. Can contain "Safari", so must come before Safari.
        [/Chrome\//, /Chrome\/(\d+)/, 80],
        // Chrome on iOS. Can contain "Safari", so must come before Safari.
        // I'm not sure exactly what the engine driving Chrome iOS is, but assuming
        // it's based on iOS Safari, which hit v14 (that's es2020 compatible) on
        // September 16, 2020, and CriOS apparently hit v100 in April 11, 2022, we
        // just go with 100.
        [/CriOS\//, /CriOS\/(\d+)/, 100],
        // Safari
        [/Safari\//, /Version\/(\d+)/, 14],
        // Firefox
        [/Firefox\//, /Firefox\/(\d+)/, 74]
    ];
    for (var i = 0; i < options.length; i++) {
        var option = options[i];
        var browserRegExp = option[0];
        var versionRegExp = option[1];
        var minVersion = option[2];
        if (!agent.match(browserRegExp)) {
            // No this browser
            continue;
        }
        // Must be this browser, so version has to be found and be greater than
        // minVersion, otherwise we'll fall back to `legacy`.
        var versionMatch = agent.match(new RegExp(versionRegExp));
        if (versionMatch) {
            var version = parseInt(versionMatch[1], 10);
            if (version >= minVersion) {
                return 'es2020';
            }
        }
        break;
    }
    return 'legacy';
}

// If window.userflow has not been initalized yet, then stub all its methods, so
// it can be used immediately, and load the Userflow.js script from CDN.
// Support importing userflow.js with server-side rendering by attaching to an
// empty object instead of `window`.
var w = typeof window === 'undefined' ? {} : window;
var userflow = w.userflow;
if (!userflow) {
    //
    var urlPrefix = 'https://js.userflow.com/';
    // Initialize as an empty object (methods will be stubbed below)
    var loadPromise = null;
    userflow = w.userflow = {
        _stubbed: true,
        // Helper to inject the proper Userflow.js script/module into the document
        load: function () {
            // Make sure we only load Userflow.js once
            if (!loadPromise) {
                loadPromise = new Promise(function (resolve, reject) {
                    var script = document.createElement('script');
                    script.async = true;
                    // Detect if the browser supports es2020
                    var envVars = w.USERFLOWJS_ENV_VARS || {};
                    var browserTarget = envVars.USERFLOWJS_BROWSER_TARGET ||
                        detectBrowserTarget(navigator.userAgent);
                    if (browserTarget === 'es2020') {
                        script.type = 'module';
                        script.src =
                            envVars.USERFLOWJS_ES2020_URL || urlPrefix + 'es2020/userflow.js';
                    }
                    else {
                        script.src =
                            envVars.USERFLOWJS_LEGACY_URL || urlPrefix + 'legacy/userflow.js';
                    }
                    script.onload = function () {
                        resolve();
                    };
                    script.onerror = function () {
                        document.head.removeChild(script);
                        loadPromise = null;
                        var e = new Error('Could not load Userflow.js');
                        console.warn(e.message);
                        reject(e);
                    };
                    document.head.appendChild(script);
                });
            }
            return loadPromise;
        }
    };
    // Initialize the queue, which will be flushed by Userflow.js when it loads
    var q = (w.USERFLOWJS_QUEUE = w.USERFLOWJS_QUEUE || []);
    /**
     * Helper to stub void-returning methods that should be queued
     */
    var stubVoid = function (
    // eslint-disable-next-line es5/no-rest-parameters
    method) {
        userflow[method] = function () {
            var args = Array.prototype.slice.call(arguments);
            userflow.load();
            q.push([method, null, args]);
        };
    };
    // Helper to stub promise-returning methods that should be queued
    var stubPromise = function (
    // eslint-disable-next-line es5/no-rest-parameters
    method) {
        userflow[method] = function () {
            var args = Array.prototype.slice.call(arguments);
            userflow.load();
            var deferred;
            var promise = new Promise(function (resolve, reject) {
                deferred = { resolve: resolve, reject: reject };
            });
            q.push([method, deferred, args]);
            return promise;
        };
    };
    // Helper to stub methods that MUST return a value synchronously, and
    // therefore must support using a default callback until Userflow.js is
    // loaded.
    var stubDefault = function (method, returnValue) {
        userflow[method] = function () {
            return returnValue;
        };
    };
    // Methods that return void and should be queued
    stubVoid('_setTargetEnv');
    stubVoid('closeResourceCenter');
    stubVoid('disableEvalJs');
    stubVoid('init');
    stubVoid('off');
    stubVoid('on');
    stubVoid('prepareAudio');
    stubVoid('registerCustomInput');
    stubVoid('remount');
    stubVoid('reset');
    stubVoid('setBaseZIndex');
    stubVoid('setCustomInputSelector');
    stubVoid('setCustomNavigate');
    stubVoid('setCustomScrollIntoView');
    stubVoid('setInferenceAttributeFilter');
    stubVoid('setInferenceAttributeNames');
    stubVoid('setInferenceClassNameFilter');
    stubVoid('setResourceCenterLauncherHidden');
    stubVoid('setScrollPadding');
    stubVoid('setServerEndpoint');
    stubVoid('setShadowDomEnabled');
    stubVoid('setPageTrackingDisabled');
    stubVoid('setUrlFilter');
    stubVoid('setLinkUrlDecorator');
    stubVoid('openResourceCenter');
    stubVoid('toggleResourceCenter');
    // Methods that return promises and should be queued
    stubPromise('endAll');
    stubPromise('endAllFlows'); // deprecated
    stubPromise('endChecklist');
    stubPromise('group');
    stubPromise('identify');
    stubPromise('identifyAnonymous');
    stubPromise('start');
    stubPromise('startFlow'); // deprecated
    stubPromise('startWalk'); // deprecated
    stubPromise('track');
    stubPromise('updateGroup');
    stubPromise('updateUser');
    // Methods that synchronously return and can be stubbed with default return
    // values and are not queued
    stubDefault('getResourceCenterState', null);
    stubDefault('isIdentified', false);
}
var userflow$1 = userflow;

export { userflow$1 as default };
//# sourceMappingURL=userflow.es.js.map
