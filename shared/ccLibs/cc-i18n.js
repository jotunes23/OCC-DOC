/* global $ */
define('CCi18n',
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['i18next', 'i18nextBackend', 'pubsub', 'ccDate', 'ccRestClient', 'ccConstants'],

  //-------------------------------------------------------------------
  // MODULE DEFINTIION
  //-------------------------------------------------------------------
  function(i18next, i18nextBackend, PubSub, CCDate, CCRestClient, CCConstants) {

    "use strict";

    /**
    * constructor
    */
    function CCi18n() {
      var localeLang,
      rootLang,
      acceptedLangs,
      fallbackLangs = [];
      this.languageSet = false;
      this.languageSetComplete = false;
      this.initialized = false;
      this.initComplete = false;
      this.localeDeferred = $.Deferred();
      this.initDeferred = $.Deferred();

      //The lang in the html element is more reliable
      //than the browser so use that if it exists
      rootLang = $(':root').attr('lang');
      if (rootLang) {
        var localeParts = rootLang.replace("-","_").split("_");
        //remove script Tag if it is present in locale code
        localeParts = this.normalizeLocale(localeParts);
        //For whatever reason i18next is using - instead of _ for
        //locale strings so if the locale features an underscore
        //it needs to be replaced
        localeLang = localeParts.join('-');
      }

      // Check for other browser accepted languages via the data-accepted-langs element
      acceptedLangs = $(':root').data('accepted-langs');
      if (acceptedLangs) {
        var langs = acceptedLangs.split(','),
        enFound = false;

        for (var i=0; i<langs.length; i++) {
          var l = langs[i].replace('_', '-');

          l = l.replace('_#', ''); // MOTOOLE - compensate for server side bug

          if (l !== rootLang) {
            if (l === 'zh-CN') {
              l = 'zh-Hans';
            }

            if (l === 'zh-TW') {
              l = 'zh-Hant';
            }

            // Add to the end of the fallback language list
            fallbackLangs.push(l);
            // If 'en' is one of our accepted languages, keep note of it
            if (l === 'en') {
              enFound = true;
            }
          }
        }

        // Add 'en' to the end of the list if we don't already have it in the list
        if (!enFound) {
          fallbackLangs.push('en');
        }
      }

      this.i18nOptions = {
        lng : localeLang,
        compatibilityJSON: 'v1',
        compatibilityAPI: 'v1',
        preload : ['en'], //Load the HTML docroot language or en as standard default
        fallbackLng : fallbackLangs.length > 1 ? fallbackLangs : 'en',
        ns : ['ns.common', 'ns.ccformats'],
        defaultNs : ['ns.common'],
        contextSeparator: ":",
        debug : false,
        useLocalStorage : false,
        useCookie : false,
      };
    }

    CCi18n.prototype.normalizeLocale = function(pLocaleParts) {
      if (pLocaleParts.length == 3 && pLocaleParts[1] === "") {
        pLocaleParts.splice(1,1); // remove empty space
        pLocaleParts[1] = pLocaleParts[1].replace('#', '');
      }

      // set zh-CN settings to zh-Hans
      if (pLocaleParts[0] === 'zh' && pLocaleParts[1] === 'CN') {
        pLocaleParts[1] = 'Hans';
      }

      // set zh-TW settings to zh-Hant
      if (pLocaleParts[0] === 'zh' && pLocaleParts[1] === 'TW') {
        pLocaleParts[1] = 'Hant';
      }
      return pLocaleParts;
    };

    CCi18n.prototype.init = function(i18nOptions, callback) {
      this.initialized = true;
      var self = this;
      i18next.use(i18nextBackend).init(i18nOptions, function(args) {
        self.initComplete = true;
        if (callback) {
          callback.apply(args);
        }
        $.Topic(PubSub.topicNames.LOCALE_READY).publish(args);
      });
    };

    CCi18n.prototype.deferInit = function(i18nOptions, callback) {
      var self = this;
      this.initDeferred.done(function(options, cb) {
        // update any options
        $.extend(i18nOptions, options);
        // now do init
        // pass in a wrapper function so we can also
        // invoked the callback passed in as
        // 'cb'
        i18next.use(i18nextBackend).init(i18nOptions, function(args) {
          if (callback) {
            callback.apply(args);
          }
          if (cb) {
            cb.apply(args);
          }
          $.Topic(PubSub.topicNames.LOCALE_READY).publish(args);
        });
      });
      return this.initDeferred.promise();
    };

    /**
    * Loads a namespace with a callback function to translate all of the keys
    * from the namespace.  This also causes the data to be returned in an
    * object tree (i.e., a  JSON Map) which makes it more usable to us.
    *
    * @param {string} Name space to load.
    * @param {Object} A map of i18next options.
    * @param {function} Callback function to invoke.
    */
    CCi18n.prototype.loadNamespace = function(pNamespace, pI18nOptions, pCallback) {
      i18next.loadNamespaces('ns.' + pNamespace, function() {

        // setup a local options map and add returning object trees
        var options = pI18nOptions;
        if (pI18nOptions) {
          options['returnObjectTrees'] = true;
        } else {
          options = {
            'returnObjectTrees' : true
          };
        }

        var objResources = i18next.t('ns.' + pNamespace + ':resources', options);
        pCallback(objResources);
      });
    };

    // Just abstracting t method into this library so all references to i18next can be removed from other modules
    CCi18n.prototype.t = i18next.t.bind(i18next);

    CCi18n.prototype.addResourceBundle = function(lng, ns, resources, deep, overwrite) {
      i18next.addResourceBundle(lng, ns, resources, deep, overwrite);
    };

    /**
    * Wrapper for i18next setLocale function.
    * Beware that setting the locale is potentially
    * async and that the i18n dictionary will be overwritten
    * each time with new values.
    * @function CCi18n#setLocale
    */
    CCi18n.prototype.setLocale = function(locale, cb) {
      /**
      * Set language for i18next and CCDate libraries
      */
      var setLanguageInternally = function(args) {

        CCDate.init(locale);

        // setLng causes i18next to reinitialise, potentially losing
        // already loaded widget resources, so only call it if the
        // locale has actually changed
        if (locale !== i18next.lng()) {
          i18next.setLng(locale, function(args) {
            // Fire message to interested code
            $.Topic(PubSub.topicNames.LOCALE_SET).publish(locale);
            if (cb) {
              cb.apply(args);
            }
          });
        }
      };

      // if we are not initialized, then attempt
      // to resolve the initDeferred, if it is set.
      if (!this.initialized && !this.initDeferred.isResolved) {
        this.initDeferred.resolve({
          fallbackLng : locale,
          lng : locale
        }, cb);
        // i18next.setLng was never getting called, adding localeDeferred callback
        this.localeDeferred.done(setLanguageInternally);
      } else {
        setLanguageInternally();
      }
    };
    /**
    * This function sets the locale exactly once.
    * Additional calls to this function will not
    * trigger the locale to be set again.
    * Note that locale setup is potentially an async operation
    * so you must not assume the locale has been set until
    * the given callback is invoked.
    */
    CCi18n.prototype.setLocaleOnce = function(locale, cb) {
      // Perform locale code mapping / normalization for Chinese
      // locales.
      var localeParts = locale.replace("-","_").split("_");
      if (localeParts[0] === "zh") {
        localeParts = this.normalizeLocale(localeParts);
        locale = localeParts.join('-');
      }

      // Don't set locale multiple times
      // This causes i18n to rebuild its internal
      // dictionary and creates strange timing issues
      if (!this.languageSet) {
        var self = this;

        this.setLocale(locale, function(args) {
          if (cb) {
            cb.apply(this, args);
            // the callback we are responsible for invoking
          }
          self.languageSetComplete = true;
          // language is all setup now
          self.localeDeferred.resolve();
          // trigger other callbacks
        });
        this.languageSet = true;
      } else if (!this.languageSetComplete) {
        // register callback that
        // will be invoked after the first languageSet is done
        this.localeDeferred.done(cb);
      } else {
        // Locale already set: everything is done. invoke callback.
        if (cb) {
          cb.call(this);
        }
      }
    };

    /**
    * In order to retrieve the resources via an endpoint, rather than a direct
    * request for the resource bundle file, the request needs to be made via
    * CCRestClient. This method is passed to i18next via the customLoad option
    *
    * @param {Object} lngValue locale/language
    * @param {Object} nsValue  namespace / resource bundle
    * @param {Object} options i18next options
    * @param {Object} loadComplete i18next callback on resource load
    */
    CCi18n.prototype.loadResources = function(lngValue, nsValue, options, loadComplete) {

      var data = {};
      data.locale = lngValue;

      var successFunc = function(result) {
        if (result.hasOwnProperty(CCConstants.RESOURCES_KEY)) {
          // filter out anything else
          var data = {};
          data.resources = result[CCConstants.RESOURCES_KEY];
          loadComplete(null, data);
        } else {
          failFunc(result);
        }
      };

      var failFunc = function(result) {

        CCRestClient.commonErrorCallback(result, result.status);

        if (result.hasOwnProperty(CCConstants.ERRORS_KEY)) {
          loadComplete(result[CCConstants.ERRORS_KEY],null);
        }
      };

      CCRestClient.request(CCConstants.ENDPOINT_RESOURCES_GET_BUNDLE, data, successFunc, failFunc, nsValue);

    };

    CCi18n.prototype.getLanguagesToResolveHierarchy = function(lngValue) {
      var localesToResolve = i18next.services.languageUtils.toResolveHierarchy(lngValue);
      return localesToResolve;
    };

    /**
    * In order to retrieve the resources via an endpoint, rather than a direct
    * request for the resource bundle file, the request needs to be made via
    * CCRestClient. This method is passed to i18next via the backend.ajax option
    *
    * @param {Object} url the URL from which to request the resources
    * @param {Object} options i18next options
    * @param {Object} loadComplete i18next callback on resource load
    */
    CCi18n.prototype.ajax = function(url, options, loadComplete) {

      // split up the URL that i18next wants to call, CCRestClient
      // wants to assemble that itself.
      var urlComponents = url.match(/\/(ns\..*)\?locale=(.*)/);
      var nsValue = urlComponents[1];
      var locale = urlComponents[2];

      var data = {};
      data.locale = locale;

      var successFunc = function(result) {
        if (result.hasOwnProperty(CCConstants.RESOURCES_KEY)) {
          // filter out anything else
          var data = {};
          data.resources = result[CCConstants.RESOURCES_KEY];
          loadComplete(JSON.stringify(data), {"status": 200});
        } else {
          failFunc(result);
        }
      };

      var failFunc = function(result) {
        CCRestClient.commonErrorCallback(result, result.status);
        if (result.hasOwnProperty(CCConstants.ERRORS_KEY)) {
          loadComplete(result[CCConstants.ERRORS_KEY], {"status": result.status});
        }
      };

      CCRestClient.request(CCConstants.ENDPOINT_RESOURCES_GET_BUNDLE, data, successFunc, failFunc, nsValue);

    };

    return new CCi18n();
  }
);

