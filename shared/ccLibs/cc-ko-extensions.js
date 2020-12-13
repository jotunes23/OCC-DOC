/**
 * @fileoverview Includes knockout extensions that contain logic specific
 * to cloud commerce functionality. Any extensions that require knowledge
 * about cloud's functionality should go here. Other extensions live
 * under ko-extensions.js
 *
 * @author Oracle
 */

/* global $ */
/**
 * @module ccKoExtensions
 */
define(
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
    'ccKoExtensions',

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
    ['knockout', 'jqueryui', 'currencyHelper', 'CCi18n', 'ccDate', 'ccNumber', 'profileHelper',
      'ccLogger', 'pubsub', 'ccConstants', 'i18next', 'navigation', 'ccLazyImages'],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
    function (ko, jqueryui, currencyHelper, CCi18n, CCDate, CCNumber, profileHelper, CCLogger, PubSub,
              CCConstants, i18next, navigation, CCLazyImages) {

      "use strict";

      var useHashBang = CCConstants.ALLOW_HASHBANG;
      var useHistoryApi = false;
      if (window.history && window.history.pushState) {
        useHistoryApi = true;
      }

      // for no index tag binding
      var ROBOTS_METATAG_NODES = ko.utils.parseHtmlFragment('<meta name=robots content=noindex>');

      //-----------------------------------------------------------------------------------------------------
      // PROPERTY EDITOR EXTENSION
      //-----------------------------------------------------------------------------------------------------
      (function() {
        var layoutViewMapping,modelUpdated, hasValue, isNumber, clearStatus,
          closeVisible, showPopover, visible, getPlacement = true,
          X_MARGIN_SMALL = 200, X_MARGIN_LARGE = 300,
          Y_MARGIN_SMALL = 100, Y_MARGIN_LARGE = 200, handleExternalEvent;

        /**
         * Handles user action on external elements (clicks or focuses)
         * Causes the popover to close.
         */
        handleExternalEvent = function(e) {
          if($(e.target).closest('.popover').length === 0) {
            closeVisible();
          }
        };

        /**
         * Gets the ultimate placement of the tooltip based on the window
         */
        getPlacement = function(placement, position) {
          var top, left, result, $win;
          $win = $(window);
          top = position.top - $win.scrollTop();
          left = position.left - $win.scrollLeft();

          //Top/Bottom replacement based on location on the screen
          if(top < Y_MARGIN_SMALL || (top < Y_MARGIN_LARGE && placement === "top")) {
            result = "bottom";
          } else if(top > $win.height() - Y_MARGIN_SMALL ||
                    (top > $win.height() - Y_MARGIN_LARGE && placement === "bottom")) {
            result = "top";
          }

          //Left/Right replacement based on location on the screen
          if(left < X_MARGIN_SMALL || (left < X_MARGIN_LARGE && placement === "left")) {
            result = "right";
          } else if (left > $win.width() - X_MARGIN_SMALL ||
                     (left > $win.width() - X_MARGIN_LARGE && placement === "right")) {
            result = "left";
          }

          return result || placement;
        };

        /**
         * Closes the visible popover
         */
        closeVisible = function() {
          if(visible) {
            visible.data('bs.popover').tip().off('keydown');
            visible.popover('destroy');
            visible = null;
            $(document).off('click', handleExternalEvent);
            $(document).off('focusin', handleExternalEvent);
          }
        };

        /**
         * Renders an elements popover.
         */
        showPopover = function(element, options, values, model) {
          var $tip, position, placement;
          var $element = $(element);
          $element.popover(options);
          $tip = $element.data('bs.popover').tip();

          if(!$tip.hasClass('in')) {
            closeVisible();
            $tip.css("z-index", values.zIndex);
            $tip.css("min-height", values.minHeight);
            $tip.css("min-width", values.minWidth);;
            $tip.children('.popover-content').attr('data-bind', "template: {name: '" + values.name +
                          "', templateUrl: '" + values.templateUrl + "', afterRender: registerCallbacks}");

            //Handle escape key to hide popover
            $tip.keydown(function(event) {
            //27 is escape
            if(event.which === 27 || event.which === 13) {
              closeVisible();
              }
            });

            //Delay the event registration to prevent the current click event from firing handleExternalEvent
            window.setTimeout(function() {
              $(document).click(handleExternalEvent);
              $(document).focusin(handleExternalEvent);
            }, 1);

            $element.popover('show');
            visible = $element;
            ko.cleanNode($tip[0]);
            ko.applyBindingsToDescendants(model, $tip[0]);
          } else {
            closeVisible();
            if($element.filter(":focusable").length > 0) {
              $element.focus();
            } else {
              $element.find(":focusable").focus();
            }
          }
        }; // end of showPopover



        /**
         * @private
         * @class knockout binding which provides a wrapper around the Bootstrap popover functionality:
         * <a href="http://getbootstrap.com/javascript/#popovers">http://getbootstrap.com/javascript/#popovers</a>.
         *
         * <h2>Parameters:</h2>
         * <ul>
         *   <li><code>{String} trigger='click'</code> - The trigger event which will display the popover.</li>
         *   <li><code>{String} class</code> - The name of the CSS class to be given to the popover content DIV.</li>
         *   <li><code>{String} container='body'</code> - The element to append the popover content DIV to.</li>
         *   <li><code>{String} placement='bottom'</code> - The placement of the popover DIV: top | bottom | left | right | auto.</li>
         *   <li><code>{String} [title]</code> - The title of the popover.</li>
         *   <li><code>{Object} [model]</code> - The view model to associate the popover with.</li>
         *   <li><code>{String} [focusOn]</code> - The element to focus on when the popover is shown.</li>
         *   <li><code>{Object[]} [callbacks]</code> - The array of callbacks that need to be registered with popover elements</li>
         *   <li><code>{String} zIndex</code> - The z-index for the popover.</li>
         *   <li><code>{String} minHeight</code> - The minimum height of the popover.</li>
         *   <li><code>{String} minWidth</code> - The minimum width of the popover.</li>
         *   <li><code>{String} name</code> - The name of the template to be used for the content of the popover.</li>
         *   <li><code>{String} templateUrl</code> - The url of the content template.</li>
         * </ul>
         *
         * @example
         * <button id="exchange-info-popover" class="btn popover-dismiss return-pop"
        data-bind="infoPopover: {container: '#cc-exchanges-orders',
                        placement: 'top',
                        templateUrl: 'templates/pages/',
                        name: 'info-popover', zIndex: 550,
                        minHeight: '70px', minWidth: '230px',
                        model: $data.CCi18n.t('ns.exchanges:resources.priceDiffInfoText'),
                        focusOn: '#cc-info-popover-close'}">
        <span class="fa fa-info-circle"></span>
      </button>
         */
        ko.bindingHandlers.infoPopover = {
          /**
            @private
            @memberof ko.bindingHandlers.infoPopover
            @function init
            @param {object} element The DOM element attached to this binding.
            @param {function(): object} valueAccessor A function that returns all of the values associated with this binding.
            @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element.
            @param {object} viewModel The viewModel that is the current context for this binding.
          */
          init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var $element, options, model, values = valueAccessor(), viewModelDef = values.model || viewModel, focusOn;
            var tabTrap = ko.bindingHandlers.tabTrap;
            visible = false;
            //Set the popover options, many can be overwritten by the binding values, but some are static
            //html is needed for the template to render,
            //container is body to ensure popover works on all elements
            //content is a div using the popover class which should set the z-index and height of the popover
            //this is necessary to ensure the popover positions correctly and that it doesn't pop-in awkwardly
            options = {
              html: true,
              trigger: values.trigger || "click",
              content: "<div class='"+ values['class'] +"'></div>",
              container: values.container || 'body',
              placement: values.placement || "bottom",
              title : values.title ? "<strong>"+values.title+"</strong>" +"<a id='cc-popover-close' href='#' class='pull-right cc-close-link' data-bind='click: close'><i class='fa fa-times'></i></a>" : ''
            };

            focusOn = values.focusOn || '';
            $element = $(element);
            model = {
              model: values.model || viewModel,

              //Focus on the element after the template has loaded
              close: function() {
                closeVisible();
                if($element.filter(":focusable").length > 0) {
                } else {
                  $element.find(":focusable").focus();
                }
                return false;
              },

              registerCallbacks: function(elements) {
                $(elements).find(focusOn).focus();
                // constrain tabbing
                tabTrap.constrain($('.popover.in'));

                // Register callbacks for popover elements if specified.
                if(Array.isArray(values.callbacks)){
                  for(var i=0; i<values.callbacks.length; i++){
                    var value = values.callbacks[i];
                    $(value['elementId']).on(value['eventType'], function(){
                      closeVisible();
                      value['callback']();
                    });
                  }
                }
              }
            };

            $element.click(function(e) {
              e.preventDefault();
              options.placement = getPlacement(values.placement, $element.offset());
              if(viewModelDef.hasOwnProperty('popoverCallbackFunction')) {
                viewModelDef.beforePopupRender(showPopover.bind(self, element, options, values, model), closeVisible.bind(self));
              } else {
                showPopover(element, options, values, model);
                $element.data('bs.popover').tip().draggable();
              }
            });
            if(options.trigger == 'hover'){
              $element.mouseenter(function(e) {
                $(element).data('bs.popover',null);
                options.placement = getPlacement(values.placement, $element.offset());
                showPopover(element, options, values, model);
                $element.data('bs.popover').tip().css("pointer-events","none");
              });
              $element.mouseleave(function(e) {
                closeVisible();
              });
            }
          }
        };
      })();

      /** @namespace ko.bindingHandlers */

      /**
       * The inTabFlow binding takes a boolean value as a parameter and sets
       * the tabindex attribute, of all descendant input elements or a specific link element, appropriately.
       *
       * NB: The jQuery ':input' selector is used here to selects all input,
       * textarea, select and button elements.
       * This is helpful to add/remove inputs from the tab flow when they can be
       * hidden, for example, by the Bootstrap collapse functionality.
       *
       * @public
       * @class
       * @example &lt;div data-bind="inTabFlow: booleanValue" ... &gt;
       */
      ko.bindingHandlers.inTabFlow = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         */
        update: function(element, valueAccessor) {
          var value = ko.utils.unwrapObservable(valueAccessor());

          // If item itself is a link, enable or disable tabbing depending on value.
          if ($(element).prop('tagName') == 'A') {
            $(element).attr('tabindex', value ? 0 : -1);
          } else {
            // Item is not a link - set tab index on child input elements
            $(element).find(":input").attr('tabindex', value ? 0 : -1);
          }
        }
      };

      /**
       *  The validatableValue binding wraps the standard value binding.
       *  It allows an observable to be marked as updated (or modified) when the element,
       *  which it provides the value for, loses focus.
       *  This is helpful for required form fields, where empty fields should be marked
       *  as an error as soon as they lose focus and not just when the value has been
       *  modified to be empty.
       *  we can ignore the default blur by passing the ignoreBlur as true.
       *  which will not show the error messages even if we focus out. for example in case of
       *  cancel scenarios, we can pass this true then it will not show the message before cancel.
       *
       *  @public
       *  @class ko.bindingHandlers.validatableValue
       *  @example &lt;input data-bind="validatableValue: inputValue" ...&gt;
       */
      ko.bindingHandlers.validatableValue = {
        /**
         * The logic run once to initialize the binding for this element.
         * Adds an event handler for onBlur
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var valueObservable = valueAccessor();
          var ignoreBlur = bindingContext.$parent.ignoreBlur;
          $(element).blur(function() {
            if(ignoreBlur && ignoreBlur()) {
              return true;
            }
            // Value must be set as modified for validation message to be shown
            if(valueObservable.isModified && ko.isObservable(valueObservable.isModified)) {
              valueObservable.isModified(true);
            }
          });

          if(valueObservable.rules && ko.isObservable(valueObservable.rules)) {
            // set the required attribute if the observable is required
            var rulesLength = valueObservable.rules().length;

            for(var i=0; i<rulesLength; ++i){
              if(valueObservable.rules()[i].rule === "required"){
                if(valueObservable.rules()[i].params === true){
                  $(element).attr("required", "required");
                }
                break;
              }
            }
          }

          ko.bindingHandlers.value.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        },

        /**
         * Update is invoked whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          ko.bindingHandlers.value.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
        }
      };


      /**
       * The validatableTarget binding is a variation on validatableValue.
       * It allows an observable to be marked as updated (or modified) when an element
       * loses focus, but where the observable in question does not provide the value.
       * This is helpful for select fields, where different observables may hold the
       * currently selected value (e.g. 'us') and the actual value (e.g. 'United States')
       * to be used for validation purposes.
       *
       * @public
       * @class ko.bindingHandlers.validatableTarget
       * @example &lt;select data-bind="value: optionObservable, validatableTarget: targetObservable" ...&gt;
       */
      ko.bindingHandlers.validatableTarget = {
        /**
         * The logic run once to initialize the binding for this element.
         * Adds an event handler for onBlur.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var targetObservable = valueAccessor();

          $(element).blur(function() {
            // Value must be set as modified for validation message to be shown
            if(targetObservable.isModified && ko.isObservable(targetObservable.isModified)) {
              targetObservable.isModified(true);
            }
          });
        }
      };

      /**
       * ccLink is a binding that allows us to use keywords to derive the href for links. Keyword mappings are
       * stored on the widget view model. When we resolve a ccLink, we start on the current widget context,
       * and walk up through the widget parents until we find a link that matches the keyword.
       *
       * @public
       * @class ko.bindingHandlers.ccLink
       * @example &lt;a data-bind="ccLink: 'cart'"&gt;
       */
      ko.bindingHandlers.ccLink = {
        /**
         * The logic run once to initialize the binding for this element.
         * @private
         * @function
         * @param {HTMLElement} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          // If we are using the histor api, then we'll use pushState to update the browser url/history
          // Additionally we'll add a click handler to "preventDefault" on the tag so we don't go
          // back to the server again
          element.addEventListener("click", function(e) {
            var data = {usingCCLink:true};
            // Trigger unsaved changes event if needs be
            $(element).trigger('click.cc.unsaved', data);

            if (!data.preventDefault) {
              var url = element.pathname + element.search;
              // If we are already on the url, don't push that url again
              if(url && window.location.pathname !== url)
                navigation.goTo(url);
            }
            else {
              e.stopImmediatePropagation();
            }

            e.preventDefault();
            return false;
          }, false);

          // This will be called when the binding is first applied to an element
          // Set up any initial state, event handlers, etc. here
          var valueObject = ko.utils.unwrapObservable(valueAccessor());
          var parents;
          var link = valueObject; // link gets set to the object we are linking to
          if (!valueObject) {
            return;
          }
          // Page is a special case in that we need to look up
          // the link data
          // Guess what is going on based off the type passed into 'value'
          // for example assume 'string' is page and for 'object'
          // we read values for displayName and url directly
          if (typeof valueObject === 'string') {
            // Walk bindingContext's $parents array to find WidgetViewModel
            var widget = null;
            var value = valueObject;

            if (viewModel.links) {
              widget = viewModel;
            } else {
              parents = bindingContext.$parents;
              // Walk the parents array, it's in there somewhere.
              for (var i = 0; i < parents.length; i++) {
                if (parents[i].links) {
                  widget = parents[i];
                  break;
                }
              }
            }
            if (widget) {
              // if it's a page look it up here
              link = widget.links()[value];
              // otherwise read the value from the thing we are linking from
            }
          }
          if (link) {
            var target = "";

            if(link.url) {
              target = link.url;
            }
            // categories, products, pages have routes instead of urls
            else if(link.route) {
              target = link.route;
            }

            // Add occsite param if it was on the initial page URL, we're allowed to switch sites on production,
            // and we're not in preview mode
            var masterViewModel = bindingContext.$masterViewModel;
            if (masterViewModel
                && masterViewModel.isPreview && !masterViewModel.isPreview()
                && masterViewModel.storeConfiguration.allowSiteSwitchingOnProduction
                && masterViewModel.storeConfiguration.allowSiteSwitchingOnProduction()) {
              if (window.siteIdOnURL && window.siteIdOnURL.length > 0) {
                if (target.indexOf('?') == -1) {
                  // No other query params
                  target += '?' + CCConstants.URL_SITE_PARAM + '=' + encodeURIComponent(window.siteIdOnURL);
                }
                else {
                  // Add as an additional query param
                  target += '&' + CCConstants.URL_SITE_PARAM + '=' + encodeURIComponent(window.siteIdOnURL);
                }
              }
            }

            var finalTarget = target;
            if (useHashBang) {
              finalTarget = '#!' + target;
            }

            var prefix = "";

            // Site URL path prefix
            // We should not be adding site as prefix for agent application.
            if (!window.isAgentApplication && window.siteBaseURLPath && window.siteBaseURLPath !== '/') {
              prefix = window.siteBaseURLPath;
            } else if (window.applicationContextPath && window.applicationContextPath !== '/') {
              prefix = window.applicationContextPath;
            }

            if (window.urlLocale) {
              var browserLanguage = JSON.parse(window.urlLocale)[0].name;
              prefix += "/" + browserLanguage;
            }

            $(element).prop('href',  prefix + target);

            // If element has no child elements and no text, we'll assume tag should have some text in it if available
            if($(element).children().length === 0 && $.trim($(element).text()) == '') {
              if(link.displayName) {
                $(element).text(link.displayName);
              }
              else {
                $(element).text(window.location.href + finalTarget);
              }
            }
          }
        }
      };

      ko.bindingHandlers.ccNavigation = {

        /**
         * Update is invoked whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var value = ko.utils.unwrapObservable(valueAccessor());

          $(element).on('click.cc.nav', function(e) {
            var url = element.pathname + element.search;

            var data = {usingCCLink:true};
            // Trigger unsaved changes event if needs be
            $(element).trigger('click.cc.unsaved', data);

            if (value != 'prevent' && !data.preventDefault) {
              navigation.goTo(url);
            }

            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
          });
        }
      };

      /**
       * The triggerMessage binding wraps the standard text & visibility
       * bindings. It should be used in conjunction with the trigger extender
       * to display the message when triggered.
       *
       * @public
       * @class ko.bindingHandlers.triggerMessage
       * @example &lt;span data-bind="triggerMessage: observable" ...&gt;
       */
      ko.bindingHandlers.triggerMessage = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         */
        update: function(element, valueAccessor) {

          var observable = valueAccessor();

          if(observable.triggerFired && ko.isObservable(observable.triggerFired)) {

            // create a handler to correctly return the message
            var msgAccessor = function () {
              if (observable.triggerFired()) {
                return observable.triggerMessage;
              } else {
                return null;
              }
            };

            // toggle visibility on message when triggered
            var visiblityAccessor = function () {
              if(observable.triggerFired()) {
                return true;
              } else {
                return false;
              }

            };

            ko.bindingHandlers.text.update(element, msgAccessor);
            ko.bindingHandlers.visible.update(element, visiblityAccessor);
          }
        }
      };

      /**
       * The widgetLocaleText binding allows translated strings to be specified for an element which are
       * looked up by resource key. The bindingValue can be given either as a string or an object. If it's a
       * string then the translated string will simply be placed in the 'text' slot of the element. If it's an
       * object then the expected structure is:
       *
       * <pre>
       * {
     *   value: &lt;resourceName&gt;,
     *   attr: &lt;name of slot to place resource&gt;,
     *   params: &lt;Parameterized variable replacement dictionary&gt;,
     *   custom: &lt;Custom settings for translation&gt;
     * }
       * </pre>
       *
       * If attr is undefined, the translated string will be placed in the default 'text' slot.
       *
       * @public
       * @class ko.bindingHandlers.widgetLocaleText
       * @example &lt;span data-bind="widgetLocaleText: 'resourceName'"&gt;&lt;/span&gt;
       * @example &lt;span data-bind="widgetLocaleText: {value:'resourceName', attr:'title'}"&gt;&lt;/span&gt;
       */
      ko.bindingHandlers.widgetLocaleText = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var bindingValue = valueAccessor();
          var resources, token, translatedString;

          var widgetModel;

          // If the view model is the WidgetViewModel, can just access the resources
          if(viewModel.translate){
            widgetModel = viewModel;
          } else {
            // Otherwise the WidgetViewModel will be in the array of parents somewhere
            var parents = bindingContext.$parents;
            for(var i=0;i<parents.length;i++){
              if(parents[i].translate) {
                widgetModel = parents[i];
                break;
              }
            }
          }

          if(typeof bindingValue == 'string') {
            translatedString = widgetModel.translate(bindingValue,null,true);
          }
          else if(typeof bindingValue == 'object' && bindingValue.value != undefined) {
            translatedString = widgetModel.translate(bindingValue.value,
              bindingValue.params,
              true,
              bindingValue.custom);
          }

          if(translatedString) {
            if((typeof bindingValue == 'string') || (typeof bindingValue == 'object' && bindingValue.attr == 'innerText')) {
              $(element).text(translatedString);
            }
            else if(typeof bindingValue == 'object' && bindingValue.attr != undefined) {
              $(element).attr( bindingValue.attr, translatedString );
            }
          }
        }
      };


      /**
       * @public
       * @class The disabled binding conditionally adds the disabled class to an element based on a condition.
       * Optionally a click event handler can be specified to apply to the element if it's enabled. For <a> tags,
       * when the condition resovles to false, a click handler specifiying "return false;" will be added to prevent
       * any navigation from that anchor tag
       *
       * @example
       * &lt;a data-bind="disabled: 'boolean condition'" ...&gt;
       * &lt;a data-bind="disabled: {condition:'boolean condition',click: eventHandler}" ...&gt;
       */
      ko.bindingHandlers.disabled = {
        'update': function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var value = false;
          var clickEvent, link;
          var bindingValue = valueAccessor();

          if(typeof bindingValue == 'boolean') {
            value = ko.utils.unwrapObservable(bindingValue);
          }
          else if(typeof bindingValue == 'object' && bindingValue.condition != undefined) {
            value = ko.utils.unwrapObservable(bindingValue.condition);

            if(bindingValue.click != undefined) {
              clickEvent = ko.utils.unwrapObservable(bindingValue.click);
            }

            if(bindingValue.link != undefined) {
              link = function() {
                return ko.utils.unwrapObservable(bindingValue.link);
              };
            }
          }

          if (value) {
            $(element).off('click.handler');

            var tag = $(element).prop('tagName');

            if('A' == tag) {
              $(element).attr('href','#');
            }

            $(element).on('click.handler', function(e){
              e.stopImmediatePropagation();
              return false;
            });

            $(element).addClass('disabled');
          }
          else {
            $(element).removeClass('disabled');
            $(element).off('click.handler');

            if(clickEvent) {

              $(element).on('click.handler', function() {
                var clickHandler = clickEvent.bind(viewModel);
                clickHandler();
                return false;
              });
            }

            if(link) {
              ko.bindingHandlers['ccLink'].init(element, link, allBindingsAccessor, viewModel, bindingContext);
            }
          }
        }
      };

      /**
       * @public
       * @class The ccDate binding uses cc-date-format.js library to format and localize the date.
       * The input can be given in any of the standard formats and a return type can be
       * specified. WidgetViewModel has implementation of the formatting.
       * @author Oracle
       *
       * @example
       * <div data-bind="ccDate: {date: '12-03-2013', format: 'DD-MM-YYYY', returnedType: 'f+l', separator: 'at'}"></div>
       * <div data-bind="ccDate: {date: '12-03-2013', format: 'DD-MM-YYYY', returnedType: 'f'}"></div>
       * <div data-bind="ccDate: {date: '12-03-2013', format: 'DD-MM-YYYY', returnedType: '+l'}"></div>
       * <div data-bind="ccDate: {date: '12-03-2013', returnedType: 'l+s'}"></div>
       * <div data-bind="ccDate: {date: '12-03-2013'"}></div>
       */
      ko.bindingHandlers.ccDate = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var bindingValue = valueAccessor();
          var value = ko.utils.unwrapObservable(bindingValue);
          var uDate = ko.utils.unwrapObservable(value.date);
          var format = ko.utils.unwrapObservable(value.format);
          var returnedType = ko.utils.unwrapObservable(value.returnedType);
          var returnedDate = ko.utils.unwrapObservable(value.returnedDate);

          returnedDate = CCDate.formatDateAndTime(uDate, format, returnedType, returnedDate);
          $(element).text(returnedDate);
        }
      };

      /**
       * @public
       * @class The ccResizeImage binding provides scaled images to be displayed based on the current viewport
       * <p>
       * It also provides the ability to specify an alternate image and image text
       * to be loaded in the event that the desired image cannot be found.
       * <p>
       * One may specify an image URL as the source. The binding simply returns image based on the current viewport size.
       * This binding also provides an option to the user to override the default dimensions for a specific viewport.
       * For e.g. user can specify override dimension for mobile viewport as xsmall: '50,50' as an option directly in the binding.
       * Binding then fetches image of size 50x50 dimensions only for mobile viewport and will continue to fetch responsive image for other viewports
       * based upon viewport dimension.
       * This binding gives an additional option to give 'size' option. This works only in case if override dimensions are not found for a particular viewport.
       * User can simply provide default size for the viewports for which override dimension is not provided. For e.g. size:'x,y' or size:'medium'.
       * If 'size' option is provided in the binding it will always override the viewport's default dimensions (only when the override dimension
       * is not provided in the binding for the current viewport).
       * This binding will attempt to find an image at the specified source URL, if one cannot be found it will fall back to the errorSrc image.
       *
       * <h2>Parameters:</h2>
       * <ul>
       *   <li><code>{Observable String} [source]</code> - The image source URL</li>
       *   <li><code>{Observable String} [large]</code> - The override dimensions for large viewport</li>
       *   <li><code>{Observable String} [medium]</code> - The override dimensions for medium viewport</li>
       *   <li><code>{Observable String} [small]</code> - The override dimensions for small viewport</li>
       *   <li><code>{Observable String} [xsmall]</code> - The override dimensions for x-small viewport</li>
       *   <li><code>{Object} [size]</code> - The default dimension if the override dimension is not found for the current viewport.</li>
       *   <li><code>{Observable String} [errorSrc]</code> - The error image URL.</li>
       *   <li><code>{Observable String} [alt]</code> - The image 'alt' text.</li>
       *   <li><code>{Observable String} [errorAlt]</code> - The error image 'alt' text.</li>
       *   <li><code>{Observable function(Object)} [onerror]</code> - The error callback function. Called with the current element.</li>
       * </ul>
       * @example
       * &lt;img data-bind="ccResizeImage: {source: '/file/v2/products/ST_AntiqueWoodChair_full.jpg', alt:'The desired image', errorSrc:'images/noImage.png', errorAlt:'No Image Found'}">&lt;/img>
       * This returns image with the current viewports default dimensions.
       * &lt;img data-bind="ccResizeImage: {source: '/file/v2/products/ST_AntiqueWoodChair_full.jpg', xsmall: '80,80', alt:'The desired image', errorSrc:'images/noImage.png', errorAlt:'No Image Found'}">&lt;/img>
       * This returns image with the current viewports default dimensions. But for x-small viewport, it returns image of size 80x80.
       * &lt;img data-bind="ccResizeImage: {source: '/file/v2/products/ST_AntiqueWoodChair_full.jpg', xsmall: '80,80', medium: '120,120', size:'50,50', alt:'The desired image', errorSrc:'images/noImage.png', errorAlt:'No Image Found'}">&lt;/img>
       * This returns image of size 80x80 and 120x120 respectively for x-small and medium viewports. For other viewports it returns image of size 50x50.
       */
      ko.bindingHandlers.ccResizeImage = {

         /**
          * Get the 'no-image' site settings, if set.
          * <p>
          * Looks up the parent hierarchy for the SiteViewModel, located at the 'site' property of WidgetViewModel, and
          * uses the noImageSrc property from the site.
          * @param bindingContext The binding context.
          * @returns {*}
          */
         getNoImageSiteSetting: function(bindingContext) {
           var errorSrc = null;

           for (var i=0; i<bindingContext.$parents.length; i++) {
             // Look for the 'site' observable in the widget view model
             if (ko.isObservable(bindingContext.$parents[i].site)) {
               errorSrc = ko.unwrap(bindingContext.$parents[i].site().noImageSrc);
               break;
             }
           }

           return errorSrc;
         },

        /**
           The logic runs once to initialize the binding for this element. Preloads the fallback image if it's already set.
           @private
           @param {Object} element The DOM element attached to this binding.
           @param {function(): object} valueAccessor A function that returns all of the values associated with this binding.
           @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element.
           @param {Object} viewModel The viewModel that is the current context for this binding.
           @param {Object} bindingContext The binding hierarchy for the current context.
         */
         init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
           var src, defaultErrSrc, siteNoImageSrc, errSrc, tmp, values = ko.utils.unwrapObservable(valueAccessor());

           //If not working with values as an object or an image element don't do anything
           if(typeof values !== 'object' || element.nodeName !== 'IMG') {
             return;
           }

           src = ko.utils.unwrapObservable(values.src);

           // Error source - use the one defined in site settings first, and then fall back to the one specified
           // in the errorSrc attribute.
           defaultErrSrc = ko.utils.unwrapObservable(values.errorSrc);
           siteNoImageSrc = ko.bindingHandlers.productImageSource.getNoImageSiteSetting(bindingContext);
           errSrc = siteNoImageSrc && siteNoImageSrc.length > 0 ? siteNoImageSrc : defaultErrSrc;

           //If both src and errorSrc are defined pre-cache the error image
           //This works under the assumption that error image src generally won't change
           //if it does there would just be a bit of extra delay before displaying the error image
           if(src && errSrc) {
             tmp = new Image();
             tmp.src = errSrc;
           }
         },

        /**
           update is run whenever an observable in the binding's properties changes. Attempts to load the desired image from
           the provided source. If the image fails to load the fallback image & text is instead used.
           @private
           @param {Object} element The DOM element attached to this binding.
           @param {function(): object} valueAccessor A function that returns all of the values associated with this binding.
           @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element.
           @param {Object} viewModel The viewModel that is the current context for this binding.
           @param {Object} bindingContext The binding hierarchy for the current context.
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

            var tmpImg, src, source, imageSrc, defaultErrSrc, siteNoImageSrc,
              errSrc, alt, title, errAlt, onerror,
              imageHeight, imageWidth, extraParameters = "",
              lazyLoadPermitted = false, initialSource, initialSrc,
              delayBeforeLoadingOutOfFocusImages = -1,
              values = ko.utils.unwrapObservable(valueAccessor());

            var defaultImgSizeForViewPorts = CCConstants.DEFAULT_IMG_SIZE_FOR_VIEWPORT;

            var validSizes = ["xsmall","small","medium","large"];

            //---- Start Of Utility Methods used here -----
            var isValidDimension = function (data) {
                if (data) {
                  var splittedData = data.split(',');
                  if (splittedData.length != 2) {
                    return false;
                  } else if (isNaN(splittedData[0]) || isNaN(splittedData[1])) {
                    return false;
                  } else {
                    return true;
                  }
                } else {
                  return false;
                }
            };

            // Closure to check if Srcset and Sizes are supported
            var isSrcSetandSizesSupported = function(){
              var img = document.createElement('img');
              var isSrcSetSupported = ('srcset' in img);
              var isSizesSupported = ('sizes' in img);
              var isSrcSetEnabled = values.isSrcSetEnabled &&  ko.utils.unwrapObservable(values.isSrcSetEnabled);

              return isSrcSetSupported && isSizesSupported && isSrcSetEnabled ;
            };

         // Closure to get the Extra Params
           var getExtraParams = function(){

             var xtraParams = "";
              // add support for image type conversion via outputFormat
               // query parameter: CCSF-7109
               var outputFormat = ko.utils.unwrapObservable(values.outputFormat);
               var quality = ko.utils.unwrapObservable(values.quality);
               var alphaChannelColor = ko.utils.unwrapObservable(values.alphaChannelColor);

               if(outputFormat) {
                 xtraParams = "&" + CCConstants.IMAGE_OUTPUT_FORMAT + "=" + outputFormat;
               }
               if(quality) {
                 xtraParams = xtraParams + "&" + CCConstants.IMAGE_QUALITY + "=" + quality;
               }
               if(alphaChannelColor) {
                 xtraParams = xtraParams + "&" + CCConstants.IMAGE_ALPHA_CHANNEL_COLOR + "=" + alphaChannelColor;
               }

               return xtraParams;
           } ;

           // Closure to get the Url for a given size dimensions
            var getUrlForSize = function(size, imgDimensions , source){
              var src = "";

              if (values[size+"_img"]){
                 src = ko.utils.unwrapObservable(values[size+"_img"]);
              }else if(source) {
                 src = replaceHeightAndWidthInUrl(source, imgDimensions["imageHeight"], imgDimensions["imageWidth"]);
              }

              var xtraParams = getExtraParams();
              if (xtraParams){
                if ( src.indexOf(CCConstants.ENDPOINT_IMAGES + "?source=")===0){
                  src = src+xtraParams;
                } else{
                  src = CCConstants.ENDPOINT_IMAGES + "?source="+src+xtraParams;
                }
              }

              var imgWidth = defaultImgSizeForViewPorts[size]["width"];


              if(src && imgDimensions.imageWidth){
               src = src+" "+imgDimensions.imageWidth+"w";
               return src;
              }
            };

            // Clousure to get the image Dimensions for a given ViewPort. Defaults to Widow Width if the ViewPort is not provided.
            var getImageDimensions = function(viewPort){

              var imgDimensions = {};
              var currentSize;

            // Get the current viewport default dimensions
                var currentWidth =  viewPort ? viewPort : ($(window)[0].innerWidth || $(window).width());
                if (currentWidth == 'large' || currentWidth >= CCConstants.VIEWPORT_LARGE_DESKTOP_LOWER_WIDTH) {
                  imgDimensions.imageHeight = defaultImgSizeForViewPorts.large.height;
                  imgDimensions.imageWidth = defaultImgSizeForViewPorts.large.width;
                  imgDimensions.minWidth = defaultImgSizeForViewPorts.large.minWidth;
                  currentSize = 'large';
                } else if (currentWidth == 'medium' || (currentWidth > CCConstants.VIEWPORT_TABLET_UPPER_WIDTH  && currentWidth < CCConstants.VIEWPORT_LARGE_DESKTOP_LOWER_WIDTH)) {
                  imgDimensions.imageHeight = defaultImgSizeForViewPorts.medium.height;
                  imgDimensions.imageWidth = defaultImgSizeForViewPorts.medium.width;
                  imgDimensions.minWidth = defaultImgSizeForViewPorts.medium.minWidth;
                  imgDimensions.maxWidth = defaultImgSizeForViewPorts.medium.maxWidth;
                  currentSize = 'medium';
                } else if (currentWidth == 'small' || (currentWidth >= CCConstants.VIEWPORT_TABLET_LOWER_WIDTH && currentWidth <= CCConstants.VIEWPORT_TABLET_UPPER_WIDTH)) {
                  imgDimensions.imageHeight = defaultImgSizeForViewPorts.small.height;
                  imgDimensions.imageWidth = defaultImgSizeForViewPorts.small.width;
                  imgDimensions.minWidth = defaultImgSizeForViewPorts.small.minWidth;
                  imgDimensions.maxWidth = defaultImgSizeForViewPorts.small.maxWidth ;
                  currentSize = 'small';
                } else {
                  imgDimensions.imageHeight = defaultImgSizeForViewPorts.xsmall.height;
                  imgDimensions.imageWidth = defaultImgSizeForViewPorts.xsmall.width;
                  imgDimensions.maxWidth = defaultImgSizeForViewPorts.xsmall.maxWidth;
                  currentSize = 'xsmall';
                }
                // If override dimensions provided in the binding then use it to override default dimensions.
                var useOverrideDimensions = false;
                switch (currentSize) {
                  case 'large':
                    if (isValidDimension(ko.utils.unwrapObservable(values.large))) {
                      imgDimensions.imageHeight = values.large.split(',')[0];
                      imgDimensions.imageWidth = values.large.split(',')[1];
                      useOverrideDimensions = true;
                    }
                    break;
                  case 'medium':
                    if (isValidDimension(ko.utils.unwrapObservable(values.medium))) {
                      imgDimensions.imageHeight = values.medium.split(',')[0];
                      imgDimensions.imageWidth = values.medium.split(',')[1];
                      useOverrideDimensions = true;
                    }
                    break;
                  case 'small':
                    if (isValidDimension(ko.utils.unwrapObservable(values.small))) {
                      imgDimensions.imageHeight = values.small.split(',')[0];
                      imgDimensions.imageWidth = values.small.split(',')[1];
                      useOverrideDimensions = true;
                    }
                    break;
                  case 'xsmall':
                    if (isValidDimension(ko.utils.unwrapObservable(values.xsmall))) {
                      imgDimensions.imageHeight = values.xsmall.split(',')[0];
                      imgDimensions.imageWidth = values.xsmall.split(',')[1];
                      useOverrideDimensions = true;
                    }
                    break;
                }
                // If override dimension for current viewport not found then search for 'size' option. size option can be in the form: 'x,y' or 'small'.
                // If valid 'size' option is provided in the binding then it overrides the dimension for all the viewports.
                if (!useOverrideDimensions) {
                  if (isValidDimension(ko.utils.unwrapObservable(values.size))) {
                    imgDimensions.imageHeight = values.size.split(',')[0];
                    imgDimensions.imageWidth = values.size.split(',')[1];
                  } else {
                    if (ko.utils.unwrapObservable(values.size)) {
                      switch (ko.utils.unwrapObservable(values.size)) {
                        case 'large':
                          if (isValidDimension(ko.utils.unwrapObservable(values.large))) {
                            imgDimensions.imageHeight = values.large.split(',')[0];
                            imgDimensions.imageWidth = values.large.split(',')[1];
                            useOverrideDimensions = true;
                          } else {
                            imgDimensions.imageHeight = defaultImgSizeForViewPorts.large.height ;
                            imgDimensions.imageWidth = defaultImgSizeForViewPorts.large.width ;
                          }
                          break;
                        case 'medium':
                          if (isValidDimension(ko.utils.unwrapObservable(values.medium))) {
                            imgDimensions.imageHeight = values.medium.split(',')[0];
                            imgDimensions.imageWidth = values.medium.split(',')[1];
                            useOverrideDimensions = true;
                          } else {
                            imgDimensions.imageHeight = defaultImgSizeForViewPorts.medium.height;
                            imgDimensions.imageWidth = defaultImgSizeForViewPorts.medium.width;
                          }
                          break;
                        case 'small':
                          if (isValidDimension(ko.utils.unwrapObservable(values.small))) {
                            imgDimensions.imageHeight = values.small.split(',')[0];
                            imgDimensions.imageWidth = values.small.split(',')[1];
                            useOverrideDimensions = true;
                          } else {
                            imgDimensions.imageHeight = defaultImgSizeForViewPorts.small.height;
                            imgDimensions.imageWidth = defaultImgSizeForViewPorts.small.width;
                          }
                          break;
                        case 'xsmall':
                          if (isValidDimension(ko.utils.unwrapObservable(values.xsmall))) {
                            imgDimensions.imageHeight = values.xsmall.split(',')[0];
                            imgDimensions.imageWidth = values.xsmall.split(',')[1];
                            useOverrideDimensions = true;
                          } else {
                            imgDimensions.imageHeight = defaultImgSizeForViewPorts.xsmall.height;
                            imgDimensions.imageWidth = defaultImgSizeForViewPorts.xsmall.width;
                          }
                          break;
                      }
                    }
                  }
                }
              return imgDimensions;
            };

            // Get the Media query for the Given size.
            var getImageMediaQuery = function(imgDimensions) {


              if ( !imgDimensions ){
                return ;
              }
              var minWidth = imgDimensions["minWidth"]   ;
              var maxWidth = imgDimensions["maxWidth"]   ;
              var imgWidth = imgDimensions["imageWidth"] ;

              var minWidthQuery = "";
              if(minWidth){
                minWidthQuery = "(min-width:"+minWidth+"px)";
              }

              var maxWidthQuery = "";
              if(maxWidth){
                maxWidthQuery = "(max-width:"+maxWidth+"px)";
              }

              if(minWidthQuery && maxWidthQuery && imgWidth  ){
                return minWidthQuery+ " and " + maxWidthQuery + " "+ imgWidth +"px";
              } else if (minWidthQuery && imgWidth) {
                return minWidthQuery+" "+ imgWidth +"px";
              } else if (maxWidthQuery && imgWidth ){
                return  maxWidthQuery + " "+ imgWidth +"px";
              } else {
                return "";
              }
            };

            var replaceHeightAndWidthInUrl = function (url, height, width){

              if (url.indexOf(CCConstants.ENDPOINT_IMAGES + "?source=") > -1){
               //URL already contains /ccstore/v1/images so we dont need to add it again. We need to just replace the height and width.
                var heightPattern = /height=[0-9]+/i ;
                if(url.search(heightPattern)){
                 url = url.replace(heightPattern , "height="+height) ;
                }

                var widthPattern = /width=[0-9]+/i ;
                if(url.search(widthPattern)){
                 url = url.replace(widthPattern , "width="+width) ;
                }

                return url;
              }

              return CCConstants.ENDPOINT_IMAGES + "?source=" + url + "&height=" + height + "&width=" + width ;

            }

           //----- End Of Local Utility Closure's -----

           /* ----- Start of the Update Method for the ccImageResize Tag ----
             If not working with values as an object or an image element don't do anything
           */

           if(typeof values !== 'object' || element.nodeName !== 'IMG') {
              return;
            }

            // Set the Default minHeight of the Image.
            var imageDimensions = getImageDimensions();
            imageHeight = imageDimensions.imageHeight;
            imageWidth =  imageDimensions.imageWidth;

            var setMinHeightBeforeImageLoad =  (values.setMinHeightBeforeImageLoad &&  ko.utils.unwrapObservable(values.isSetMinHeightBeforeImageLoad)) ?
                                ko.utils.unwrapObservable(values.isSetMinHeightBeforeImageLoad)
                                : true ;

            if (element.parentNode && setMinHeightBeforeImageLoad){
              var parent = element.parentNode;

              if (parent.getAttribute("id") !== "cc_img__resize_wrapper"){
                var wrapper = document.createElement('div');

                element.onload = function() {
                wrapper.style.minHeight = "0px";

                  // Re-enable dynamic image sizes if image loaded is error image
                  // as long as this is isn't the initial image for lazy loading
                  if (this.src.indexOf(errSrc) > -1 && isSrcSetandSizesSupported() &&
                    !this.dataset.lazyLoading) {

                    var srcSetVal = "";
                    var sizesVal = "";

                    for(var key=0; key < validSizes.length ; key++){
                      // Set the img SrcSet Val
                      var imgDimensions = getImageDimensions(validSizes[key]);
                      var url = getUrlForSize(validSizes[key], imgDimensions, errSrc);
                      if(url && ( srcSetVal.indexOf(url) < 0)) {
                        srcSetVal = srcSetVal ? srcSetVal + "," + url :  url  ;
                      }

                      //Set the img Size Val
                      var currSize = getImageMediaQuery(imgDimensions);
                      if(currSize){
                        sizesVal =  sizesVal ? sizesVal + "," + currSize : currSize ;
                      }
                    }

                    // assign this to elements Srcset.
                    if (srcSetVal && (element.srcset === undefined || element.srcset !== srcSetVal)) {
                      element.srcset = srcSetVal;
                    }

                    if (sizesVal && (element.sizes === undefined || element.sizes !== sizesVal)) {
                      element.sizes = sizesVal ;
                    }

                  }
                }

                // Set the Default minHeight of the Image.
                wrapper.style.maxWidth =  "100%";
                wrapper.style.minHeight = imageHeight+"px";
                wrapper.style.height = "100%";
                var id = ko.utils.unwrapObservable(values.id);
                if(id) {
                 wrapper.setAttribute("id", ("cc_img__resize_wrapper-") + id);
                }
                else {
                  wrapper.setAttribute("id", "cc_img__resize_wrapper");
                }
                // set the wrapper as child (instead of the element)
                parent.replaceChild(wrapper, element);
                // set element as child of wrapper
                wrapper.appendChild(element);
              }
            }

            extraParameters = getExtraParams();
            source = ko.utils.unwrapObservable(values.source);
            if(source) {
              src = isSrcSetandSizesSupported() ? source : replaceHeightAndWidthInUrl(source, imageHeight, imageWidth);
              if(extraParameters) {
                src = src + extraParameters;
              }
            } else {
              src = values.errorSrc;
            }

            // Error source - use the one defined in site settings first, and then fall back to the one specified
            // in the errorSrc attribute.
            defaultErrSrc = ko.utils.unwrapObservable(values.errorSrc);
            if (defaultErrSrc == null || defaultErrSrc.length == 0) {
              defaultErrSrc = CCConstants.SITE_DEFAULT_NO_IMAGE_URL;
            }
            siteNoImageSrc = ko.bindingHandlers.ccResizeImage.getNoImageSiteSetting(bindingContext);
            errSrc = siteNoImageSrc && siteNoImageSrc.length > 0  ? siteNoImageSrc : defaultErrSrc;

            source = encodeURI(source);
           // If the product image URL matches the default error source,
           // use errSrc instead to allow for a site specific no-image image
        if (source.indexOf(CCConstants.SITE_DEFAULT_NO_IMAGE_URL) == 0) {
             src = errSrc;
             source = errSrc;
        }

            if(!alt) {
            alt = ko.utils.unwrapObservable(values.alt);
            }
            if(!title) {
              title = ko.utils.unwrapObservable(values.title);
            }

            errAlt = ko.utils.unwrapObservable(values.errorAlt);
            onerror = ko.utils.unwrapObservable(values.onerror);

          // Check whether lazy loading of images is permitted
          // - check optional binding attribute
          // - check store configuration setting
          // - disable if prerender in use or using error source or image is visible
          var masterViewModel = bindingContext.$masterViewModel;
          var disableLazyImageLoading = ko.utils.unwrapObservable(values.disableLazyImageLoading);
          if (!disableLazyImageLoading
            && masterViewModel
            && masterViewModel.storeConfiguration
            && masterViewModel.storeConfiguration.lazilyLoadImages === true
            && !("prerenderReady" in window)
            && source !== errSrc
            && !CCLazyImages.isImageVisible(element, src)) {
            lazyLoadPermitted = true;
          }

          // Determine what initial (placeholder) image to use for the lazy image
          if (lazyLoadPermitted) {
            initialSource = ko.utils.unwrapObservable(values.initialSrc);
            if (initialSource) {

              // Set up height and width
              initialSrc = isSrcSetandSizesSupported() ? initialSource : replaceHeightAndWidthInUrl(initialSource, imageHeight, imageWidth);
              if (extraParameters) {
                initialSrc = initialSrc + extraParameters;
              }
            }
            // Provide a default initial source for the image if one is not provided
            else {
              initialSource = (values.errorSrc) ? values.errorSrc : errSrc;
            }

            // If the initial source matches the default error source,
            // use errSrc instead to allow for a site specific no-image image
            initialSource = encodeURI(initialSource);
            if (initialSource.indexOf(CCConstants.SITE_DEFAULT_NO_IMAGE_URL) == 0) {
              initialSrc = errSrc;
              initialSource = errSrc;
            }

            // Determine the delay for loading all remaining out of focus images
            if (masterViewModel.storeConfiguration.delayBeforeLoadingOutOfFocusImages) {
              delayBeforeLoadingOutOfFocusImages =
                masterViewModel.storeConfiguration.delayBeforeLoadingOutOfFocusImages;
            }
          }

          // Apply bindings to the image source
          if(src) {
               if(alt) {
                 element.alt = alt;
               }
               if(title) {
                 element.title = title;
               }

               // replace the existing onerror handler with one
               // that displays the error image
               element.onerror = function() {
                 var errorImage = new Image();

                 // On successful load of the error image, display it in place of the product image
                 errorImage.onload = function() {
                   // If the image fails to load, displays the error image
                   element.src = errSrc;

                   // Disable dynamic imaging
                   if(element.srcset){
                     element.removeAttribute("srcset");
                   }

                   if(element.sizes){
                     element.removeAttribute("sizes");
                   }

                   //run the binding's onerror event.
                   if(onerror) {
                     onerror(element);
                   }
                   // clear out the onerror handler to prevent an infinite loop in Firefox and IE browsers
                   // if the errorSrc or default site error image is not found
                   element.onerror="";
                 };

                 // Fallback 1.
                 // If the error image fails to load, for any reason, fall back to the default error image
                 errorImage.onerror = function() {

                   var defaultErrorImage = new Image();

                   // Default error image loaded
                   defaultErrorImage.onload = function() {
                     element.src = defaultErrorImage.src;

                     if(element.srcset){
                       element.removeAttribute("srcset");
                     }

                     if(element.sizes){
                       element.removeAttribute("sizes");
                     }

                     //run the binding's onerror event.
                     if(onerror) {
                       onerror(element);
                     }
                     // clear out the onerror handler to prevent an infinite loop in Firefox and IE browsers
                     // if the errorSrc or default site error image is not found
                     element.onerror="";
                   };

                   // Fallback 2.
                   // If the default error image fails, for any reason, as a final fallback, show /img/no-image.jpg
                   defaultErrorImage.onerror = function() {
                     element.src = CCConstants.SITE_DEFAULT_NO_IMAGE_URL;

                     if(element.srcset){
                       element.removeAttribute("srcset");
                     }

                     if(element.sizes){
                       element.removeAttribute("sizes");
                     }

                     //run the binding's onerror event.
                     if(onerror) {
                       onerror(element);
                     }
                     // clear out the onerror handler to prevent an infinite loop in Firefox and IE browsers
                     // if the errorSrc or default site error image is not found
                     element.onerror="";
                   }

                   defaultErrorImage.src = defaultErrSrc;
                 }

                 // If the image fails to load, displays the error image
                 // If initial image source is the error image, avoid second fetch on same image
                 if (src === errSrc) {
                   if (errSrc === siteNoImageSrc) {
                     errSrc = defaultErrSrc;
                   }
                   else {
                     errSrc = CCConstants.SITE_DEFAULT_NO_IMAGE_URL;
                   }
                 }
                 errorImage.src = errSrc;

                 if(errAlt) {
                   element.alt = errAlt;
                 }
               }; // end of element.onerror function

             // display the image source immediately (CCSF-7170)
             // Support lazy loading of the image if not using Prerender
             if (lazyLoadPermitted) {
               // Set up error handling criteria for the lazily loaded image
               element.dataset.errorSrc = errSrc;
               element.dataset.defaultErrorSrc = defaultErrSrc;
               if (onerror) {
                 element.dataset.onerror = onerror;
               }
               if (errAlt) {
                 element.dataset.errorAlt = errAlt;
               }

               // Set up styling for the lazily loaded image
               CCLazyImages.setupLazyLoadStyling(element, values);

               // Set up the lazy image and monitoring of it
               element.dataset.src = src;
               CCLazyImages.observeLazyImage(element, delayBeforeLoadingOutOfFocusImages);

               // Display the placeholder image for the lazy loading image
               element.src = initialSrc;
             }
             else {
               element.src = src;
             }

               // Browser supports Html5 srcset and sizes attributes.
               if(isSrcSetandSizesSupported() && src !== errSrc){

                  var srcSetVal = "";
                  var sizesVal = "";

                  for(var key=0; key < validSizes.length ; key++){
                   // Set the img SrcSet Val
                     var imgDimensions = getImageDimensions(validSizes[key]);
                     var url = getUrlForSize(validSizes[key], imgDimensions, source);
                     if(url && ( srcSetVal.indexOf(url) < 0)) {
                      srcSetVal = srcSetVal ? srcSetVal + "," + url :  url  ;
                     }

                   //Set the img Size Val
                   var currSize = getImageMediaQuery(imgDimensions);
                   if(currSize){
                     sizesVal =  sizesVal ? sizesVal + "," + currSize : currSize ;
                   }
                 }

                  // assign the element's srcset and sizes values
                  if(srcSetVal ){
                    if (lazyLoadPermitted) {
                      element.dataset.srcset = srcSetVal;
                    }
                    else {
                      element.srcset = srcSetVal;
                    }
                  }

                  if(sizesVal){
                    if (lazyLoadPermitted) {
                      element.dataset.sizes = sizesVal;
                    }
                    else {
                      element.sizes = sizesVal ;
                    }
                  }
               }

               // Setup srcset and sizes attributes for the initial image
               if (lazyLoadPermitted && isSrcSetandSizesSupported() && initialSrc !== errSrc) {
                 var initialSrcSetVal = "";
                 var initialSizesVal = "";

                 for (var key=0; key < validSizes.length ; key++) {
                   // Set the srcset for the initial image
                   var imgDimensions = getImageDimensions(validSizes[key]);
                   var url = getUrlForSize(validSizes[key], imgDimensions, initialSource);
                   if (url && (initialSrcSetVal.indexOf(url) < 0)) {
                     initialSrcSetVal = initialSrcSetVal ? initialSrcSetVal + "," + url : url;
                   }

                   //Set the img Size Val
                   var currSize = getImageMediaQuery(imgDimensions);
                   if (currSize) {
                     initialSizesVal =  initialSizesVal ? initialSizesVal + "," + currSize : currSize ;
                   }
                 }

                 // Assign these to the element
                 if (initialSrcSetVal) {
                   element.srcset = initialSrcSetVal;
                 }
                 if (initialSizesVal) {
                   element.sizes = initialSizesVal;
                 }
               }

            } else {
              //If we have no main image at all then just load the fallback image
               element.src = errSrc;
              if(errAlt) {
                element.alt = errAlt;
              } else if(alt) {
                element.alt = alt;
              }

              //run the binding's onerror event.
              if(onerror) {
                onerror(element);
              }
            }
        }
      };


      /**
       * @public
       * @class The ccNumber binding uses the cc-numberformat.js to format
       * and internationalize numbers
       * @author Oracle
       *
       * @example
       * <div data-bind="ccNumber: '1234.5'"></div>
       */
      ko.bindingHandlers.ccNumber = {
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var bindingValue = valueAccessor();
          var value = ko.utils.unwrapObservable(bindingValue);
          var returnedNumber = null;
          returnedNumber = CCNumber.formatNumber(value);
          $(element).text(returnedNumber);
        }
      };

      /**
       * Helper binding to add a variable to the knockout binding context
       * widgetLayout can then be accessed on the bindingContext i.e. bindingContext.$widgetLayout.
       *
       * @public
       * @class
       * @example &lt;!-- ko setContextVariable:{name:'widgetLayout',value:'test'} --&gt;
       */
      ko.bindingHandlers.setContextVariable = {

        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {

          var value = ko.utils.unwrapObservable(valueAccessor());
          bindingContext['$' + value.name] = ko.utils.unwrapObservable(value.value);
          var i = value;
        }
      };

      // allows containerless binding
      ko.virtualElements.allowedBindings.setContextVariable = true;

      /**
       * The element binding.
       * @public
       * @class
       * @param {string} type The element type - This determines the template to load
       * @param {string} id Unique instance ID for element
       * Will also check for an id value in the allBindingsAccessor
       * @example
       * data-bind="element: 'product-title'"
       * data-bind="element: 'product-title', id: '100004'"
       * data-bind="element: {type: 'product-title', id: '100004'}"
       */
      ko.bindingHandlers.element = {
        /**
         * The logic run once to initialize the binding for this element.
         * Indicates that this binding controls decendantBindings.
         * @private
         * @function
         * @param {Object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns
         * all of the values associated with this binding.
         */
        init: function(element, valueAccessor, allBindingsAccessor, widget, bindingContext) {
          var values = ko.utils.unwrapObservable(valueAccessor());
          var mappingBase = widget.jsPath() + '/';

          for (var key in widget.elementsJs) {
            if (values === key) {

              if(widget.elementsJs.hasOwnProperty(key)) {
                var elementJs = widget.elementsJs[key]();

                if (elementJs !== null) {

                  var BASE_URL_END_STRING = 'widget/';

                  var urlSeparatorIndex = elementJs.indexOf(BASE_URL_END_STRING)
                    + BASE_URL_END_STRING.length;
                  var jsMappingBase =
                    elementJs.substring(0, urlSeparatorIndex - 1);
                  var jsIdx = elementJs.lastIndexOf('.');

                  require({baseUrl: mappingBase}, [elementJs], function(js) {

                    if (typeof js === 'function') {
                      js();
                    }
                    else if (js.hasOwnProperty('onLoad')
                      && typeof js.onLoad === 'function') {
                      js.onLoad(widget);
                    }

                    var elementName = js.elementName;

                    // Store element JS in widget property <elementName> provided
                    // that it does not clash with existing widget property
                    if (widget.hasOwnProperty(elementName)) {
                      CCLogger.warn("Element name " + elementName +
                          " is same as existing property");
                    }
                    else {
                      widget[elementName] = js;
                    }

                    widget.elements[elementName] = js;

                    // Block is asynchronous so reset widget as initialized
                    if (widget.initialized()) {
                      widget.initialized.valueHasMutated();
                    }
                  });
                }
              }

            }
          }

          return {'controlsDescendantBindings' : true};
        },

        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var value = ko.utils.unwrapObservable(valueAccessor());
          var type, id;

          if (!value) {
            return;
          }

          if(typeof(value) === "string") {
            type = value;
          } else if(typeof value === "object" && value.type != undefined) {
            type = value.type;

            if(value.id != undefined) {
              id = value.id;
            }
          } else {
            return;
          }

          if(!id || id === "") {
            if(allBindingsAccessor().id && allBindingsAccessor().id !== "") {
              id = allBindingsAccessor().id;
            } else {
              id = "id";
            }
          }

          var widgetId = (bindingContext.$data.id && bindingContext.$data.id()) ? bindingContext.$data.id() : "";
          var widgetType = (bindingContext.$data.typeId && bindingContext.$data.typeId()) ? bindingContext.$data.typeId() : "";

          var elementInstance = {};
          elementInstance.type = type;
          elementInstance.fullType = widgetType + "-" + type;
          elementInstance.id = id;
          elementInstance.textId = "text." + id;
          elementInstance.elementId = widgetId +"-" + type + "-" + id;

          elementInstance.styles = "";

          if(id !== "" && bindingContext.$elementConfig) {
            elementInstance.config = bindingContext.$elementConfig[id];

            if(elementInstance.config && elementInstance.config.font) {
              elementInstance.styles = elementInstance.config.font.styles || "";

              // If we are a block level element with an associated font,
              // check for padding and it to the wrapper tag as an inline style.
              if (elementInstance.config.font.styles.display && elementInstance.config.font.styles.display === "block" &&
                  elementInstance.config.padding &&
                  (elementInstance.config.padding.paddingTop > 0 || elementInstance.config.padding.paddingBottom > 0 ||
                   elementInstance.config.padding.paddingLeft > 0 || elementInstance.config.padding.paddingRight > 0)) {
                /* top | right | bottom | left */
                elementInstance.styles["padding"] = elementInstance.config.padding.paddingTop + "px " +
                    elementInstance.config.padding.paddingRight + "px " +
                    elementInstance.config.padding.paddingBottom + "px " +
                    elementInstance.config.padding.paddingLeft + "px";
              }
            }
          }

          // Set ID and styles on the current element
          // (i.e. the one with the element binding)
          $(element).attr('id', elementInstance.elementId);
          if (elementInstance.styles != "") {
            $(element).css(elementInstance.styles);
          }
          bindingContext['$elementInstance'] = elementInstance;

          // Setup template values which mimic the binding of a template.
          var templateValues = {};
          templateValues.name = elementInstance.fullType;
          templateValues.data = viewModel;
          templateValues.url = "";

          //Render the template
          ko.bindingHandlers.template.update(element,
            function() {
              return templateValues;
            }, allBindingsAccessor, viewModel, bindingContext
          );

        }

      };

      /**
       * The addTemplateBinding
       * @public
       * @class
       * @param {string} type The template code to add
       */
      ko.bindingHandlers.addTemplate = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var value = ko.utils.unwrapObservable(valueAccessor());

          if(typeof(value) === "string") {

            $(value).not('text').each( function() {
              var id = this.id;

              if(id && id !== "") {
                if($('body').find('#'+id).length == 0) {
                  $('body').append(this);
                }
              }
            });

          }
        }
      };

      // allows containerless binding
      ko.virtualElements.allowedBindings.addTemplate = true;


      /**
       * The previewBar binding
       * @public
       * @class
       * @param {bool} are we in preview
       */

      ko.bindingHandlers.previewBar = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var isPreview = ko.utils.unwrapObservable(valueAccessor());

          if (!isPreview) {
            return;
          }

          if (bindingContext.$data.previewBar) {
            var previewBar = bindingContext.$data.previewBar;
            var cssPath = previewBar.cssPath;
            var templateUrl = previewBar.templateUrl;
            var templateName = previewBar.templateName;
          } else {
            return;
          }

          // Get the CSS if we need it
          if (!$("link[href='" + cssPath + "']").length)
            $('<link href="' + cssPath + '" rel="stylesheet">').appendTo("head");

          // Setup template values which mimic the binding of a template.
          var templateValues = {};
          templateValues.name = templateName;
          templateValues.data = viewModel;
          templateValues.templateUrl = templateUrl;
          templateValues.afterRender = previewBar.attachEventHandlers;

          // Render the template, once the jet menu components have loaded
          $.when(previewBar.ojLoaded).done(function() {
            ko.bindingHandlers.template.update(element,
              function() {
                return templateValues;
              }, allBindingsAccessor, viewModel, bindingContext);
          });
        }
      };

      // allows containerless binding
      ko.virtualElements.allowedBindings.previewBar = true;

      /**
       * The noIndexMeta binding
       * @public
       * @class
       * @param {bool} display noindex metatag
       */

      ko.bindingHandlers.noIndexMeta = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var isNoIndex = ko.utils.unwrapObservable(valueAccessor());

          // Just add or remove the metatag. Element will be the virtual binding (comment)
          if (isNoIndex) {
            // ko.virtualElements.setDomNodeChildren(element, ko.utils.parseHtmlFragment('<meta name=robots content=noindex>'));
            ko.virtualElements.setDomNodeChildren(element, ROBOTS_METATAG_NODES);
          } else {
            ko.virtualElements.emptyNode(element);
          }
        }
      }

      // allows containerless binding
      ko.virtualElements.allowedBindings.noIndexMeta = true;

      /**
       * The embeddedAssistance extender works with the password validator to provide an embedded assistance
       * for a password field in case there is an error in the password validation.
       * @public
       * @class
       * @param {Object} element The DOM element attached to this binding
       * @param {function(): object} valueAccessor A function that returns
       * all of the values associated with this binding.
       */
      ko.bindingHandlers.embeddedAssistance = {
        /**
         * The logic run once to initialize the binding for this element.
         * Indicates that this binding controls decendantBindings.
         * @private
         * @function
         * @param {Object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns
         * all of the values associated with this binding.
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var observable = valueAccessor();
          observable.subscribe(function(){
            ko.bindingHandlers.embeddedAssistance.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
          });
        },

        /**
         * update is run whenever an observable in the binding's properties changes.
         * @private
         * @function
         * @memberOf embeddedAssistance
         * @name update
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
          var observable = valueAccessor();

          observable.extend({ validatable: true });

          var isModified = false;
          var isValid = false;

          isModified = observable.isModified() && observable().length > 0;
          isValid = observable.isValid();

          // create a handler to correctly return embedded assistance
          var embeddedMessageAccessor = function () {
            if (isModified) {
              return isValid ? null : observable.embeddedAssistance;
            } else {
              return null;
            }
          };

          //toggle visibility on validation messages when validation hasn't been evaluated, or when the object isValid
          var visiblityAccessor = function () {
            return isModified ? !isValid : false;
          };

          ko.bindingHandlers.text.update(element, embeddedMessageAccessor);
          ko.bindingHandlers.visible.update(element, visiblityAccessor);
        }
      };

      /** @namespace ko.extenders */

      /**
       * The propertyWatch extender provides the ability to listen for any changes within an
       * observable object's properties, without having to subscribe to each property individually.
       *
       * @public
       * @function
       * @param {observable} root Base observable to watch for changes.
       * @param {object} config object to configure throttle settings
       * @example
       * myObservable = ko.observable().extend({ propertyWatch: { targetObject : myObservable , throttle : 2000 });
       *
       * myObservable.hasChanged.subscribe(function(hasChanged){...});
       */
      ko.extenders.propertyWatch = function (root, config) {

        var thr = config ? (config.throttle? config.throttle : 100) : 100;

        root.initialState = ko.observable(ko.toJSON(root));

        root.resetWatch = function() {
          root.initialState(ko.toJSON(root));
        };

        root.hasChanged = ko.computed(function() {
          var changed = root.initialState() !== ko.toJSON(root);

          if (changed) {
            root.resetWatch();
          }
          return changed;
        }).extend({notify: "always", throttle: thr})
          .extend({notify: "always"});

        return root;
      };

      /**
       * The trigger extender allows a message to be triggered when the
       * observable has a given value. This extender should be used in conjunction
       * with the triggerMessage binding, which will display the message.
       * This could possibly be reworked, at a later date, to accept a list of
       * values or multiple value:message pairs, but for now it does what's needed.
       *
       * @public
       * @function
       * @param {observable} observable The target observable.
       * @param {Object} params A trigger value for the observable and a message that
       * is to be triggered when the observable has that value.
       * @example
       * myObservable = ko.observable().extend({ trigger: {value: myTriggerValue, message: myTriggerMessage} });
       */
      ko.extenders.trigger = function(observable, params) {

        observable.triggerSet     = false;
        observable.triggerValue   = null;
        observable.triggerMessage = '';

        observable.triggerFired   = ko.observable(false);

        if(params) {
          if(params.value) {
            observable.triggerValue = params.value;
            observable.triggerSet = true;
          }

          if(params.message) {
            observable.triggerMessage = params.message;
          }
        }

        observable.trigger = function(newValue) {
          if(observable() ===  observable.triggerValue) {
            observable.triggerFired(true);
          } else {
            observable.triggerFired(false);
          }
        };

        observable.clearTrigger = function() {
          observable.triggerFired(false);
        };

        if(observable.triggerSet) {
          // listen for changes to the observable
          observable.subscribe(observable.trigger);
        }

        return observable;
      };

      /**
       * The accessControl binding to restrict elements according to the role.
       * The accessKey has to be given in the binidng which has to be restricted.
       * The accessKey is verified against the role of the current admin profile.
       * If the accessKey exists in the allowedAccesses for the profile the element
       * will be shown else it has to be hidden.
       *
       * Supports both strong binding as well as virtual element binding.
       *
       * @example
       * <div id="cc-publish-dropdown" class="btn-group pull-right"  data-bind="accessControl: {accessKey: 'publishing-button'}">
       *
       * <!-- ko accessControl: {accessKey: 'publishing-title'} -->
       *       <h2 class="cc-page-title" data-bind="localeText: 'updatesToPublishText'"></h2>
       * <!-- /ko -->
       *
       */
        ko.bindingHandlers.accessControl = {
            init : function(element, valueAccessor, allBindingsAccessor) {
              var accessControl = allBindingsAccessor().accessControl;
              var defaultAction = accessControl.defaultAction ? accessControl.defaultAction : CCConstants.HIDE;

              if (!profileHelper.isAuthorized(accessControl.accessKey)) {
                // if this is not a virtual binding, show/hide only that element
                if(defaultAction === CCConstants.SHOW){
                  //any action incase of showing element
                }else{
                  $(element).hide();
                  ko.virtualElements.emptyNode(element);
                }
              }else{
                if(defaultAction === CCConstants.SHOW){
                  $(element).hide();
                  ko.virtualElements.emptyNode(element);
                }else{
                }
              }
            }
        };
      //allows containerless binding, i.e., virtual element binding
      ko.virtualElements.allowedBindings.accessControl = true;

      /*
       * This method is useful for handling "show more expand/collapse" functionality.
       * @param pInitial Input array
       * @param pLimit Limit for displaying show more
       * @return {Array} Returns onservable array based on limit and showAll toggle
       */
      ko.showMoreArray = function(pInitial, pLimit) {
        var observable = ko.observableArray(pInitial);
        observable.limit = pLimit;
        observable.showAll = ko.observable(false);
        //showButton is used to display expand/collapse button
        observable.showButton = observable().length  > observable.limit;
        //toggleShowAll is used to toggle between show more and less
        observable.toggleShowAll = function() {
            observable.showAll(!observable.showAll());
        };
        //observable.display contains items which is finally being rendered on screen
        observable.display = ko.computed(function() {
            if (observable.showAll() || !observable.showButton) { return observable(); }
            return observable().slice(0,observable.limit);
        }, observable);
        return observable;
      };

      /**
       * The agentBar binding
       * @public
       * @class
       * @param {bool} indicating if it is on-behalf-of flow
       */

      ko.bindingHandlers.agentBar = {
        /**
         * update is run whenever an observable in the binding's properties
         * changes.
         * @private
         * @function
         * @param {object} element The DOM element attached to this binding
         * @param {function(): object} valueAccessor A function that returns all of the values associated with this binding
         * @param {function(): object} allBindingsAccessor Object containing information about other bindings on the same HTML element
         * @param {object} viewModel The viewModel that is the current context for this binding.
         * @param {object} bindingContext The binding hierarchy for the current context
         */
        update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var isObo = ko.utils.unwrapObservable(valueAccessor());

            if (!isObo) {
              return;
            }
            var masterViewModel = bindingContext.$data;
            var cssPath = "/shared/css/agent-bar.css";
            // Get the CSS if we need it
            if (!$("link[href='" + cssPath + "']").length)
              $('<link href="' + cssPath + '" rel="stylesheet">').appendTo("head");

            // Setup template values which mimic the binding of a template.
            var templateValues = {};
            templateValues.name = 'agent-bar.template';
            templateValues.data = viewModel;
            templateValues.templateUrl = '/shared/templates';
            //Attach the template of the agent bar to the DOM
            ko.bindingHandlers.template.update(element,
              function() {
                return templateValues;
              }, allBindingsAccessor, viewModel, bindingContext);      }
      };
      // allows containerless binding
      ko.virtualElements.allowedBindings.agentBar = true;

      /**
       * The numeric extender writes to an observable
       * to be numeric rounded to a configurable level of precision.
       * @public
       * @function
       * @param {observable} target The target observable.
       * @param {Object} precision level of precision
       * @example
       * myObservable = ko.observable().extend({ numeric: 2 });
       */
      ko.extenders.numeric = function(target, precision) {
        //create a writable computed observable to intercept writes to our observable
        var result = ko.computed({
          read: target,  //always return the original observables value
          write: function(newValue) {
            var pattern = /^-?[0-9]+([.][0-9]+)?$/;
            var isValid = pattern.test(newValue);
            target(newValue);
            if (isValid) {
              var current = target(),
                roundingMultiplier = Math.pow(10, precision),
                newValueAsNum = isNaN(newValue) ? 0 : +newValue,
                valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
                //only write if it changed
                if (valueToWrite !== current) {
                  target(valueToWrite);
                } else {
                  //if the rounded value is the same, but a different value was written, force a notification for the current field
                  if (newValue !== current) {
                    target.notifySubscribers(target());
                  }
                }
              }
            }
          }).extend({ notify: "always" });

          //initialize with current value to make sure it is rounded appropriately
          result(target());

          //return the new computed observable
          return result;
        };

      /**
       * The fireChange binding
       * @public
       * @class
       * @param {bool} indicating if change event should be fired on update
       */
      ko.bindingHandlers.fireChange = {
          update: function (element, valueAccessor, allBindingsAccessor){
              var bindings = allBindingsAccessor();
              if (bindings.value != null && (!$(element).data('previousVal') || $(element).data('previousVal') != bindings.value)) {
                bindings.event.change();
                var previousValue = bindings.value;
                $(element).data('previousVal', previousValue);
              }
          }
      };
    }
  );

