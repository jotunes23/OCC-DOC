/**
* @fileoverview EE Tag processor for Cloud Commerce Application
* @version: 1.0
*/
define(
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
  'ccEETagProcessor',

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  ['pubsub', 'ccConstants', 'ccRestClient', 'jquery'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(PubSub, CCConstants, CCRestClient, $) {

    "use strict";

    /**
    * EE Page tag processor for Cloud Commerce Application
    *
    * @name CCEETagProcessor
    *
    * @property {string[]} excludePages The array of pages to exclude.
    * @property {boolean} enabled=true Enabled flag.
    */
    function CCEETagProcessor() {}

    // The pages to exclude from EE list
    CCEETagProcessor.prototype.excludedPages = [];
    // The page tag location
    CCEETagProcessor.prototype.location = "";
    // The cc-metrics location
    CCEETagProcessor.prototype.ccMetricsLocation = "";
    // The EE tag configurations
    CCEETagProcessor.prototype.configurations = {};
    // The EE id
    CCEETagProcessor.prototype.eeid = 0;

    // Don't want the data to be available on preview(design).
    CCEETagProcessor.prototype.enabled = true;
    // Tag loaded
    CCEETagProcessor.prototype.tagLoaded = false;
    // Metrics loaded
    CCEETagProcessor.prototype.metricsLoaded = false;
    // Layout ID
    CCEETagProcessor.prototype.layoutId = "";
    // CC Metrics Tracker
    CCEETagProcessor.prototype.ccMetricsTracker = {};

    /**
    * Init method for the tag processor
    *
    * @function CCEETagProcessor#init
    */
    CCEETagProcessor.prototype.init = function() {
      var self = this;
      // Only initialize if enabled.
      if (self.enabled) {
        self.deferred = $.Deferred();
        // Get the EE tag data.
        CCRestClient.request(CCConstants.ENDPOINT_GET_EE_PAGE_TAG_DATA,
          null, self.updateEETagDataSuccess.bind(self),
          self.updateEETagDataFail.bind(self)
          );

          // When the page load completes, validate the page and call the ee to run.
          // If the page is not the type make sure that the ee tags are not loaded.
          $.Topic(PubSub.topicNames.PAGE_READY).subscribe(function (obj) {
            // If EE tag data is not loaded then defer pageReady function's execution.
            if(self.location == "") {
              self.deferred.done(function() {
                self.pageReady(obj);
              });
            } else {
              self.pageReady(obj);
            }
          });

          // Subscribe to these event to take in the server data when the page loads.
          // These executes before the page is ready.
          $.Topic(PubSub.topicNames.PAGE_LAYOUT_LOADED).subscribe(self.setLayout.bind(self));
          $.Topic(PubSub.topicNames.PAGE_METADATA_CHANGED).subscribe(self.setLayout.bind(self));

          // Also subscribe to the page based Pubsubs to make sure that the stop
          // rules gets called if the page is one of the excluded ones.
          $.Topic(PubSub.topicNames.PAGE_VIEW_CHANGED).subscribe(self.pageChanged.bind(self));
          $.Topic(PubSub.topicNames.PAGE_CONTEXT_CHANGED).subscribe(self.pageChanged.bind(self));
          $.Topic(PubSub.topicNames.PAGE_PARAMETERS_CHANGED).subscribe(self.pageChanged.bind(self));
        }
      };

      /** Success scenario */
      CCEETagProcessor.prototype.updateEETagDataSuccess = function(data) {
        var self = this;
        self.location = data.location;
        self.excludedPages = data.excludedPages;
        // Data is most probably going to come in as string. Parse Parse Parse!!
        self.eeid = data.eeid;
        self.configurations = data.configurations;
        self.ccMetricsLocation = data.ccMetricsUrl;
        self.deferred.resolve();
      };

      /** Failure scenario */
      CCEETagProcessor.prototype.updateEETagDataFail = function(data) {
        // Fail gracefully... Remove all subscription
        $.Topic(PubSub.topicNames.PAGE_READY).unsubscribe(self.pageReady.bind(self));
        $.Topic(PubSub.topicNames.PAGE_VIEW_CHANGED).unsubscribe(self.pageChanged.bind(self));
        $.Topic(PubSub.topicNames.PAGE_CONTEXT_CHANGED).unsubscribe(self.pageChanged.bind(self));
        $.Topic(PubSub.topicNames.PAGE_PARAMETERS_CHANGED).unsubscribe(self.pageChanged.bind(self));
        $.Topic(PubSub.topicNames.PAGE_LAYOUT_LOADED).unsubscribe(self.setLayout.bind(self));
        $.Topic(PubSub.topicNames.PAGE_METADATA_CHANGED).unsubscribe(self.setLayout.bind(self));

      };

      /**
      * Gets called when the page is loaded with all its data. Gets called from
      * the PAGE_READY PubSub subscription.
      *
      * @function CCEETagProcessor#pageReady
      * @param {Object} data The page level data that is returned from the server
      * call.
      */
      CCEETagProcessor.prototype.pageReady = function(data) {
        var self = this;
        // Only load the tag if the page is not an excluded one.
        // Also make sure that this works only if the locations is not empty.
        if (self.excludedPages.indexOf(data.pageId) == -1 && self.location) {
          if (!self.tagLoaded) {
            require([self.location], function() {
              // Adding the null checks
              if (window.ATGSvcs) {
                if (window.OracleUnifiedVisit && OracleUnifiedVisit.eeid && ATGSvcs.setEXPID) {
                  ATGSvcs.setEEID && ATGSvcs.setEEID(OracleUnifiedVisit.eeid);
                  ATGSvcs.setEXPID(self.eeid);
                } else {
                  ATGSvcs.setEEID && ATGSvcs.setEEID(self.eeid);
                }
                // Set each of the configurations as key value pair
                for (var config in self.configurations) {
                  ATGSvcs.setCfg && ATGSvcs.setCfg(config, self.configurations[config]);
                }
                // Set the layout ID. This should be for the first load as well as
                // any page changes.
                ATGSvcs.setCfg && ATGSvcs.setCfg('layoutId', self.layoutId);
                // Reset and continue. If first time, start.
                ATGSvcs.ee && ATGSvcs.ee.reset();
              }
            });
            self.tagLoaded = true;
          } else {
            // Adding the null checks
            if (window.ATGSvcs) {
              // Set the layout ID. This should be for the first load as well as
              // any page changes.
              ATGSvcs.setCfg && ATGSvcs.setCfg('layoutId', self.layoutId);
              //Reset and continue
              ATGSvcs.ee && ATGSvcs.ee.reset();
            }
          }
        }

        // For loading ccEEMetricTracker
        if (self.excludedPages.indexOf(data.pageId) == -1 && self.ccMetricsLocation && !self.metricsLoaded) {
          require([self.ccMetricsLocation], function(obj) {
            self.ccMetricsTracker = obj;
          });
          self.metricsLoaded = true;
        }
      };

      /**
      * Gets called to check if the page is an excluded type page even before the
      * page is completely loaded to prevent it from processing the tag rules on
      * those pages.
      *
      * @Function CCEETagProcessor#pageChanged
      * @param {Object} data The page level data that is returned from the routing
      * call.
      */
      CCEETagProcessor.prototype.pageChanged = function(data) {
        var self = this;
        // Check if the page is an excluded page. If so, call the stop rules to make
        // sure that the tag rules are not loaded for this page.
        // In case the page first hit doesn't load EE, should not give a JS error.
        if (typeof window.ATGSvcs !== "undefined" && window.ATGSvcs && self.excludedPages.indexOf(data.pageId) > -1) {
          ATGSvcs.stopRules && ATGSvcs.stopRules();
          // Delete the window variable.
          delete window.ATGSvcs;
          // Undefine the require based location to refresh.
          require.undef(self.location);
          self.tagLoaded = false;
        }
        if (self.ccMetricsLocation && self.excludedPages.indexOf(data.pageId) > -1) {
          // Unhook from events needed to track commerce metrics
          if (self.ccMetricsTracker.ccMetricUnhook) {
            self.ccMetricsTracker.ccMetricUnhook();
          }
          require.undef(self.ccMetricsLocation);
          self.metricsLoaded = false;
        }
      };

      /**
      * Gets called when the page data changes. This just takes the layout ID and
      * updates it to the variable.
      *
      * @function CCEETagProcessor#setLayout
      * @param {Object} data the page level data
      * @param {Object} the event specific data
      */
      CCEETagProcessor.prototype.setLayout = function(data, eventData) {
        var self = this;
        self.layoutId = data.layout();
      };

      return new CCEETagProcessor();
    }
);

