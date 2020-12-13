/**
* @fileoverview Includes an error handling wrapper for defined knockout bindings.
* To be used in storefront.
*
*/

/*global $ */
/**
* @module ccKoErrorWrapper
*/
define(
  //-------------------------------------------------------------------
  // PACKAGE NAME
  //-------------------------------------------------------------------
  'ccKoErrorWrapper',

  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  [ 'knockout', 'ccLogger', 'ccRestClient' ],

  //-------------------------------------------------------------------
  // MODULE DEFINITION
  //-------------------------------------------------------------------
  function(ko, CCLogger, ccRestClient) {

    "use strict";

    var bindingsToWrap = [ 'attr', 'css', 'template', 'text', 'style', 'value' ];

    /**
    * A wrapper function for a binding update method.
    * It handles error logging and highlighting the affected widget/region in preview mode.
    */
    function errorWrapper(nativeFunction) {
      return function() {
        try {
          return nativeFunction.apply(this, arguments);
        } catch (e) {
          CCLogger.error(e);

          var rootNode = arguments[0];
          var layoutViewModel = ko.contextFor($(rootNode)[0]).$root;

          if (layoutViewModel && layoutViewModel.isPreview && layoutViewModel.isPreview()) {
            // design studio preview
            var $container = $(rootNode).parents('.widget-container,.stack-container');
            if ($container.length > 0) {
              $container.find('.stack-template,.displayTemplate').addClass('error');
              $container.find('div.display-error').show();
              $container.find('span.error-msg').first().text(e.message);
            }

            // storefront in preview mode
            var $errorDiv = $(rootNode).prev('div.sf-display-error');
            if ($errorDiv.length == 0) {
              $errorDiv = $(rootNode).parents().prev('div.sf-display-error');
            }
            if ($errorDiv.length > 0) {
              $errorDiv.show();
              $errorDiv.find('span.sf-error-msg').text(e.message);
              $errorDiv.next('div').addClass('sf-error');
            }
          }
        }
      };
    }

    // go through defined binding names and wrap binding's update method if the binding exist
    // in ko.bindingHandlers array and it has the update method
    var key;
    if (ccRestClient.previewMode) {
      for (key in bindingsToWrap) {
        var value = bindingsToWrap[key];
        if (ko.bindingHandlers[value] && ko.bindingHandlers[value].update) {
          var nativeUpdate = ko.bindingHandlers[value].update;
          ko.bindingHandlers[value].update = errorWrapper(nativeUpdate);
        }
      }
    }
  }
);