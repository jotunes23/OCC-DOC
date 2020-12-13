/**
 * Public Javascript API for Oracle Cloud Commerce
 */

define(
  //-------------------------------------------------------------------
  // DEPENDENCIES
  //-------------------------------------------------------------------
  'addThis',['ccConstants', 'ccRestClient'],

  //-------------------------------------------------------------------
  // MODULE DEFINTIION
  //-------------------------------------------------------------------

  function (ccConstants, ccRestClient) {
  "use strict";

   if (window.addthis && window.addthis.user !== undefined && window.addthis.user.ready !== undefined) {
     function addthisReady() {
       var counter = 0;
       var interval = setInterval(function () {
         var data = addthis.user.interests();
         if ( (data !== undefined && data.length !== undefined && data.length > 0) || counter == 100) {
           clearInterval(interval);
           var inputData = {};
           inputData["interests"] = addthis.user.interests();
           // AddThis data is available now to call server to process
           ccRestClient.request(ccConstants.ENDPOINT_SAVE_ADDTHIS_INTERESTS, inputData,
             // success callback
             function(data) {},
             // error callback
             function(data) {}
           );
         }
         counter++;
       }, 100)
     }
     // Check if we have addThis data ready.
     addthis.user.ready(addthisReady);
  }
});