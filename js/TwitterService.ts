
 import Profile = require('./Profile');
 import ProfileView = require('./ProfileView');
class TwitterService{
    settings: any;
      public BaseUrl= 'https://twitter.com';
       constructor(settings) {
           this.settings = settings;
       }



   // TwitterService.prototype.searchProfilesDTP = function (screen_names) {
   //     let from = screen_names.map(function(val,index,arr) { return '%20from%3A'+val; });
   //     let nameQuery = from.join('%20OR');
   
   //     ///search?f=tweets&q=%23DTP%20address%20signature%20from%3Atrustprotocol%20OR%20from%3Akeutmann&src=typd
   //     let url = '/search?f=tweets&q=%23DTP%20address%20signature' + nameQuery + '&src=typd';
   //     if(url.length > 4096) {
   //         DTP.trace("function searchProfilesDTP query string is too long. Length: "+url.length);
   //     }
   //     this.getData(url, 'html').then((html) => {

   //         let result = extractDTP(html);

   //         deferred.resolve(result);
   //     }).fail((error) => deferred.fail(error));

   // }

   getProfileDTP (screen_name) {
       let deferred = $.Deferred();
       let url = '/search?f=tweets&q=%23DTP%20Address%20Signature%20from%3A'+ screen_name +'&src=typd';
       this.getData(url, 'html').then((html) => {

           let $body = $(html);
           let tweets = $body.find(null)
           let result = this.extractDTP(html);

           deferred.resolve(result);
       }).fail((error) => deferred.fail(error));

       return deferred;
   }

   extractDTP (html) {
       let content = html.findSubstring('<div class="js-tweet-text-container">', '</div>');
       if(content == null) {
           return null;
       }

       let text = $(content).text();
       text = text.replace(/(?:\r\n|\r|\n)/g, ' ').trim();

       if(text.length === 0) {
           return null;
       }

       let result = {
           address: text['findSubstring']('Address:', ' ', true, true),
           signature: text['findSubstring']('Signature:', ' ', true, true),
           scope: '', // global
       }

       return result;
   }

   getData (path, dataType) {
       let deferred = $.Deferred();
       //let self = this;
       let url = this.BaseUrl+path;
       dataType = dataType || "json";

       $.ajax({
           type: "GET",
           url: url,
           headers: {
               'accept': 'application/json, text/javascript, */*; q=0.01',
               'X-Requested-With': 'XMLHttpRequest',
               'x-twitter-active-user': 'yes'
           },
           dataType: dataType,
       }).done(function (data, textStatus, jqXHR) {
           deferred.resolve(data);
       }).fail( (jqXHR, textStatus, errorThrown) => {
           this.errorHandler(jqXHR, textStatus, errorThrown);
           deferred.fail();
       });
       return deferred.promise();
   }


   sendTweet  (data) {
       return this.postData('/i/tweet/create', data);
   }

   postData (path, data) {
       //let self = this;
       var deferred = $.Deferred();

       let url = this.BaseUrl + path;
       //let postData = 'authenticity_token=' + DTP.Profile.Current.formAuthenticityToken + '&' + data;
       data.authenticity_token = Profile.Current.formAuthenticityToken;

       $.ajax({
           type: "POST",
           url: url,
           data: data,
           contentType: 'application/x-www-form-urlencoded; charset=UTF-8',
           headers: {
               'accept': 'application/json, text/javascript, */*; q=0.01',
               'X-Requested-With': 'XMLHttpRequest',
               'x-twitter-active-user': 'yes'
           },
           dataType: 'json',
       }).done(function (msg, textStatus, jqXHR) {
           deferred.resolve(msg);
       }).fail( (jqXHR, textStatus, errorThrown) => {
           this.errorHandler(jqXHR, textStatus, errorThrown);
           deferred.fail();
       });
       return deferred.promise();
   }

   errorHandler(jqXHR, textStatus, errorThrown) {
       if (jqXHR.status == 404 || errorThrown == 'Not Found') {
           let msg = 'Error 404: Server was not found.';
           ProfileView.showMessage(msg);
       }
       else {
           let msg: string = textStatus + " : " + errorThrown;
           if (jqXHR.responseJSON.ExceptionMessage){
            msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);
           }else if(jqXHR.responseJSON.message){
            msg = JSON.stringify(jqXHR.responseJSON.message, null, 2);
           }
           ProfileView.showMessage(msg);
       }
   }

   
}
export = TwitterService