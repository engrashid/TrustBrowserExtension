(function (DTP) {

    DTP.ProfileController = (function () {
        function ProfileController(profile, view, host) { 
            this.profile = profile;
            this.view = view;
            this.view.controller = this;
            this.host = host;
            this.trustHandler = null;
            this.domElements = [];
            this.time = 0;
        }

        // Update data for the profile
        ProfileController.prototype.update = function() {
            let deferred = $.Deferred();
            let self = this;

            if(self.profile.owner) {
                deferred.resolve(self.profile);

            } else {
                self.host.twitterService.getProfileDTP(self.profile.screen_name).then((owner) => {
                    if(owner != null) {
                        try {
                            if(DTP.ProfileController.verifyDTPsignature(owner, self.profile.screen_name)) {
                                self.profile.owner = owner;
                                self.save();
                            }
                        } catch(error) {
                            DTP.trace(error);
                        }
                    }
                    deferred.resolve(self.profile);
                });
            }

            return deferred;
        }

        ProfileController.prototype.save = function() {
            this.host.profileRepository.setProfile(this.profile);
        }

        ProfileController.prototype.calculateTrust = function() {
            if(!this.trustHandler) 
                return;

            let ownerAddress = (this.profile.owner) ? this.profile.owner.address : "";
            this.profile.result = this.trustHandler.CalculateBinaryTrust(this.profile.address, ownerAddress);
        }


        ProfileController.prototype.render = function(element) {
            if(element) {
                this.view.renderElement(element);
                return;
            }

            for (let item of this.domElements) {
                this.view.renderElement(item);
            }
        }
       
        ProfileController.prototype.trust = function() {
            DTP.trace("Trust "+ this.profile.screen_name);
            return this.trustProfile(true, 0);
        }

        ProfileController.prototype.distrust = function() {
            DTP.trace("Distrust "+ this.profile.screen_name);

            return this.trustProfile(false, 0);
        }

        ProfileController.prototype.untrust = function() {
            DTP.trace("Untrust "+ this.profile.screen_name);
            return this.trustProfile(undefined, 1);
        }

        ProfileController.prototype.trustProfile = function(value, expire) {
            const self = this;
            return this.buildAndSubmitBinaryTrust(self.profile, value, expire).then(function(result) {
                //self.controller.render();
                DTP.trace('TrustProfile done!');
            });
        }

        ProfileController.prototype.twitterUserAction = function() {
             const self = this;

            if(!self.profile.result)
                return;

            if(self.profile.result.state < 0) {

                if(self.blocked || self.domElements.length == 0)
                    return;

                if(location.href.indexOf(self.profile.screen_name) >= 0) 
                    return; // Ignore the profile page for now

                let $selectedTweet = $(self.domElements[0]);

                if(this.host.settings.twitterdistrust == "automute") {
                    $selectedTweet.find("li.mute-user-item").trigger("click");
                }

                if(this.host.settings.twitterdistrust == "autoblock") {
                    $selectedTweet.find("li.block-link").trigger("click");
                    $("body").removeClass("modal-enabled");
                    $(document).find("#block-dialog").hide();
                    $(document).find("button.block-button").trigger("click");
                    $(document).find("span.Icon--close").trigger("click");
                }
    
                self.blocked = true;

                // $selectedTweet.trigger("uiBlockAction", {
                //     screenName: self.profile.screen_name, 
                //     userId: self.profile.userId,
                //     tweetId: tweet_id,
                //     scribeContext: {component: "block_dialog", element: "tweet"}
                // });
                
            }

            
        }


        ProfileController.prototype.buildAndSubmitBinaryTrust = function(profile, value, expire) {
            const self = this;
            let package = this.host.subjectService.BuildBinaryTrust(profile, value, null, expire);
            this.host.packageBuilder.SignPackage(package);
            DTP.trace("Updating trust");
            return this.host.trustchainService.PostTrust(package).then(function(trustResult){
                DTP.trace("Posting package is a "+trustResult.status.toLowerCase()+ ' '+ trustResult.message);
    
                // Requery everything, as we have changed a trust
                self.host.queryDTP(self.host.sessionProfiles);

                // if (self.updateCallback) {
                //     self.updateCallback(profile);
                // }
    
            }).fail(function(trustResult){ 
                DTP.trace("Adding trust failed: " +trustResult.message,"fail");
            });
        }


        // profile will usually be a deserialized neutral object
        ProfileController.addTo = function(profile, twitterService, domElement) {
            if (!profile.controller) {
                let view = new DTP.ProfileView();
                let controller = new DTP.ProfileController(profile, view, twitterService);
                // Make sure that this property will no be serialized by using Object.defineProperty
                Object.defineProperty(profile, 'controller', { value: controller });
            }
            profile.controller.domElements.push(domElement);
            $(domElement).data("dtp_profile", profile);
        }

        ProfileController.bindEvents = function(element, profileRepository) {
            $(element).on('click', '.trustIcon', function (event) {
                let button = this;
                $(button).addClass('trustSpinner24');
                let tweetContainer = ProfileController.getTweetContainer(button);
                let screen_name = $(tweetContainer).attr("data-screen-name");
                let profile = profileRepository.ensureProfile(screen_name);
                profile.controller.selectedElement = tweetContainer;

                ProfileController.loadProfile(screen_name, profileRepository).then(function(profile) {
                    if(button.classList.contains('trust')) {
                        profile.controller.trust().then(RemoveSpinner);
                    }

                    if(button.classList.contains('distrust')) {
                        profile.controller.distrust().then(RemoveSpinner);
                    }

                    if(button.classList.contains('untrust')) {
                        profile.controller.untrust().then(RemoveSpinner);
                    }
                });

                function RemoveSpinner() {
                    $(button).removeClass('trustSpinner24');
                }
            });

        }

        ProfileController.getTweetContainer = function(element)  {
            return $(element).closest('div.tweet'); //.attr("data-screen-name");
        }

        ProfileController.verifyDTPsignature = function(dtp, message) {
            return tce.bitcoin.message.verify(dtp.address, dtp.signature, message);
        }

        ProfileController.loadProfile = function(screen_name, profileRepository) {
            let profile = profileRepository.getProfile(screen_name);
            return profile.controller.update();
        }

        return ProfileController;
    }());

    DTP.ProfileView = (function () {
        function ProfileView(controller) {
            this.controller = controller;
            //this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
            this.Anchor = '.ProfileTweet-action--favorite';
            this.fullNameGroup = '.FullNameGroup';
        }

        
        ProfileView.prototype.renderElement = function(element) {
            const $element = $(element);
            let bar = $element.data('dtp_bar');
            if(!bar) {
                let $anchor = $element.find(this.Anchor);

                if($anchor.find('.trustIcon').length > 0)
                    return;

                bar = {
                    trust: this.createButton("Trust", "trustIconPassive", "trust"),
                    distrust: this.createButton("Distrust", "distrustIconPassive", "distrust"),
                    untrust:this.createButton("Untrust", "untrustIconPassive", "untrust")
                }

                bar.$fullNameGroup = $element.find(this.fullNameGroup);
                bar.$fullNameGroup.prepend(ProfileView.createIdenticon(this.controller.profile));
               
                $anchor.after(bar.untrust.$html);
                $anchor.after(bar.distrust.$html);
                $anchor.after(bar.trust.$html);
                bar.untrust.$html.hide();

                $element.data('dtp_bar', bar);
            }

            bar.trust.$a.removeClass("trustIconActive").addClass("trustIconPassive");
            bar.trust.$span.text('');
            bar.distrust.$a.removeClass("distrustIconActive").addClass("trustIconPassive");
            bar.distrust.$span.text('');

            if(!this.controller.profile.result)
                return;

            if (this.controller.profile.result.state > 0) {
                bar.trust.$a.removeClass("trustIconPassive").addClass("trustIconActive");
                bar.trust.$span.text(this.controller.profile.result.trust);

            } 

            if (this.controller.profile.result.state < 0 ) {

                if(this.controller.host.settings.twitterdistrust == "hidecontent") {
                    bar.distrust.$a.removeClass("trustIconPassive").addClass("distrustIconActive");
                    bar.distrust.$span.text(this.controller.profile.result.distrust);
                    $element.find('.js-tweet-text-container').hide();
                    $element.find('.QuoteTweet-container').hide();
                    $element.find('.AdaptiveMediaOuterContainer').hide();
                }
                if(this.controller.host.settings.twitterdistrust == "automute") {
                     $element.hide(); // Hide the tweet!
                }
            }
            else {
                $element.find('.js-tweet-text-container').show();
                $element.find('.QuoteTweet-container').show();
                $element.find('.AdaptiveMediaOuterContainer').show();
            }

            if (this.controller.profile.result.direct) {
                bar.untrust.$html.show();
            }
        } 

        ProfileView.createTweetDTPButton = function() {
            let $editButton = $('.ProfileNav-list .edit-button');
            if($editButton.length == 0)
                return;

            let $tweetDTP = $editButton.parent().find('button.tweet-dtp');
            if($tweetDTP.length > 0)
                return;
           
            $tweetDTP = $(
                '<button type="button" class="EdgeButton EdgeButton--tertiary dtpUserAction-Button tweet-dtp">'+
                '<span class="button-text">Tweet DTP</span>'+
                '</button>'
            );
            
            $editButton.before($tweetDTP);
        }
        
        ProfileView.showMessage = function(message) {
            var pop = $('#message-drawer');
            pop.find('.message-text').text(message);
            pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(function() {
                pop.addClass('hidden').attr("style", "top: -40px;");
            });
        }

        ProfileView.createIdenticon = function(profile) {
            let iconData = null;

            // if (profile.owner) {
            //     if(!profile.owner.data) {
            //         let icon = new Identicon(profile.owner.address, {margin:0.1, size:16, format: 'svg'});
            //         profile.owner.identiconData16 = icon.toString();
            //         profile.time = Date.now();
            //         profile.controller.save();
            //     }                    
            //     iconData = profile.owner.identiconData16;
            // } else {
            
            if(!profile.identiconData16) {
                let icon = new Identicon(profile.address, {margin:0.1, size:16, format: 'svg'});
                profile.identiconData16 = icon.toString();
                profile.time = Date.now();
                profile.controller.save();
            }
            iconData = profile.identiconData16;
            //}

            let $icon = $('<a title="'+profile.screen_name+'" href="javascript:void 0" title"'+ profile.address +'"><img src="data:image/svg+xml;base64,' + iconData + '" class="dtpIdenticon"></a>');
            $icon.data("dtp_profile", profile);
            $icon.click(function() {
                var opt = {
                    command:'openDialog',
                     url: 'trustlist.html',
                     data: $(this).data('dtp_profile')
                 };
                 opt.w = 800;
                 opt.h = 800;
                 var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
                 var wTop = window.screenTop ? window.screenTop : window.screenY;
        
                 opt.left = Math.floor(wLeft + (window.innerWidth / 2) - (opt.w / 2));
                 opt.top = Math.floor(wTop + (window.innerHeight / 2) - (opt.h / 2));
                
                 chrome.runtime.sendMessage(opt);
                 return false;
             });
            return $icon;
        }
    



        ProfileView.prototype.createButton = function(text, iconClass, type, count) {
            let number = count || "";
            let html = '<div class="ProfileTweet-action ProfileTweet-action" style="min-width:40px">'+
            '<button class="ProfileTweet-actionButton u-textUserColorHover js-actionButton" type="button" >' +
            '<div class="IconContainer js-tooltip" >'+
            '<span class="Icon Icon--medium"><a class="trustIcon '+ type +' js-tooltip '+  iconClass +'" data-original-title="'+text+'" title="'+text+'"></a></span>' +
            '<span class="u-hiddenVisually">'+text+'</span>'+
            '</div>'+
            '<span class="ProfileTweet-actionCount">'+
            '<span class="ProfileTweet-actionCountForPresentation" aria-hidden="true">'+ number +'</span>'+
            '</span>'+
            '</button></div>';

            let $html = $(html);
            return {
                $html: $html,
                $a: $("a", $html),
                $span: $('.ProfileTweet-actionCountForPresentation', $html)
            }
        }
        return ProfileView;
    }());


    DTP.Profile = (function () {
        function Profile(screen_name) { 
            this.screen_name = screen_name;
            this.alias = screen_name;
            this.address = screen_name.hash160().toDTPAddress();
            this.scope = window.location.hostname;
        }

        Profile.LoadCurrent = function(settings, profileRepository) {
            Profile.Current = JSON.parse($("#init-data")[0].value);

            if(settings.address) {
                Profile.Current.owner = {
                    scope: '',
                    address: settings.address,
                    signature: tce.bitcoin.message.sign(settings.keyPair, Profile.Current.screenName),
                    valid : true
                };
            }

            let profile = profileRepository.ensureProfile(Profile.Current.screenName);
            profile.owner = Profile.Current.owner;
            profileRepository.setProfile(profile);
        }


        Profile.Current = null;

        return Profile;
    }());

    DTP.TwitterService = (function ($) {
        function TwitterService(settings) {
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

        TwitterService.prototype.getProfileDTP = function (screen_name) {
            let deferred = $.Deferred();
            let url = '/search?f=tweets&q=%23DTP%20Address%20Signature%20from%3A'+ screen_name +'&src=typd';
            this.getData(url, 'html').then((html) => {

                let $body = $(html);
                let tweets = $body.find()
                let result = this.extractDTP(html);

                deferred.resolve(result);
            }).fail((error) => deferred.fail(error));

            return deferred;
        }

        TwitterService.prototype.extractDTP = function (html) {
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
                address: text.findSubstring('Address:', ' ', true, true),
                signature: text.findSubstring('Signature:', ' ', true, true),
                scope: '', // global
            }

            return result;
        }

        TwitterService.prototype.getData = function (path, dataType) {
            let deferred = $.Deferred();
            let self = this;
            let url = TwitterService.BaseUrl+path;
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
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.errorHandler(jqXHR, textStatus, errorThrown);
                deferred.fail();
            });
            return deferred.promise();
        }


        TwitterService.prototype.sendTweet = function (data) {
            return this.postData('/i/tweet/create', data);
        }

        TwitterService.prototype.postData = function (path, data) {
            let self = this;
            var deferred = $.Deferred();

            let url = TwitterService.BaseUrl + path;
            //let postData = 'authenticity_token=' + DTP.Profile.Current.formAuthenticityToken + '&' + data;
            data.authenticity_token = DTP.Profile.Current.formAuthenticityToken;

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
            }).fail(function (jqXHR, textStatus, errorThrown) {
                self.errorHandler(jqXHR, textStatus, errorThrown);
                deferred.fail();
            });
            return deferred.promise();
        }

        TwitterService.prototype.errorHandler = function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status == 404 || errorThrown == 'Not Found') {
                var msg = 'Error 404: Server was not found.';
                DTP.trace(msg);
            }
            else {
                var msg = textStatus + " : " + errorThrown;
                if (jqXHR.responseJSON)
                    msg = JSON.stringify(jqXHR.responseJSON.ExceptionMessage, null, 2);

                DTP.trace(msg);
            }
        }

        TwitterService.BaseUrl = 'https://twitter.com';

        return TwitterService;
    }(jQuery));
    

    DTP.Twitter = (function ($) {
        function Twitter(settings, packageBuilder, subjectService, trustchainService, twitterService, profileRepository) {
            var self = this;
            self.OwnerPrefix = "[#owner_]";
            self.settings = settings;
            self.subjectService = subjectService;
            self.targets = [];
            self.packageBuilder = packageBuilder;
            self.trustchainService = trustchainService;
            self.twitterService = twitterService;
            self.profileRepository = profileRepository;
  
            self.queryResult = {};
            self.waiting = false;
            self.profilesToQuery= {};
            self.sessionProfiles = {};
            

            self.processElement = function(element) { // Element = dom element
                let screen_name = element.attributes["data-screen-name"].value;
                let profile = self.profileRepository.ensureProfile(screen_name, self.profileView);

                DTP.ProfileController.addTo(profile, self, element);
                
                self.sessionProfiles[profile.screen_name] = profile; // All the profiles in the current page session
                if(profile.controller.time == 0) { 
                    self.profilesToQuery[profile.screen_name] = profile;
                }

                profile.controller.render(element);
            }
        }

        Twitter.prototype.getTweets = function() {
            var tweets = $('.tweet.js-stream-tweet');
            return tweets;
        }

        Twitter.prototype.queryDTP = function (profiles) {
            let self = this;
            if(!profiles || Object.keys(profiles).length == 0) {
                return;
            }

            return this.trustchainService.Query(profiles, window.location.hostname).then(function(result) {
                if (result && result.status == "Success") {
                    DTP.trace(JSON.stringify(result, null, 2));
                    let th = new TrustHandler(result.data.results, self.settings);
                    th.BuildSubjects();
                    
                    for (let key in profiles) {
                        if (!profiles.hasOwnProperty(key))
                            continue;
        
                        let profile = profiles[key];
                        profile.queryResult = result.data.results;
                        profile.controller.trustHandler = th;
                        profile.controller.time = Date.now();
                        profile.controller.calculateTrust();
                        profile.controller.twitterUserAction();
                        profile.controller.render();
                        profile.controller.save();
                    }
                }
                else {
                    if(result)
                        DTP.trace(result.message);
                }
            });
        }

        Twitter.prototype.tweetDTP = function() {
            const self = this;

            let status = 'Digital Trust Protocol #DTP \rAddress:' + DTP.Profile.Current.owner.address
                         + ' \rSignature:' + DTP.Profile.Current.owner.signature.toBase64();
            let data = {
                batch_mode:'off',
                is_permalink_page:false,
                place_id: !0,
                status: status 
            };

            self.twitterService.sendTweet(data).then(function(result) {
                DTP.Profile.Current.DTP = DTP.Profile.Current.DTP || {};
                DTP.Profile.Current.DTP.tweet_id = result.tweet_id;
                DTP.ProfileView.showMessage("DTP tweet created");
            });
        }

        Twitter.prototype.ready = function (element) {
            const self = this;

            $(element).ready(function () {

                DTP.Profile.LoadCurrent(self.settings, self.profileRepository);

                var tweets = self.getTweets();

                tweets.each(function(i, element) {
                    self.processElement(element);
                });

                                
                DTP.ProfileController.bindEvents(element, self.profileRepository);
                DTP.ProfileView.createTweetDTPButton();

            });



            $(element).on('DOMNodeInserted', function (e) {
                let classObj = e.target.attributes['class'];
                if (!classObj) 
                    return;

                let permaTweets = $(e.target).find('.tweet.permalink-tweet');
                permaTweets.each(function(i, element) {
                    self.processElement(element);
                });
                
                let tweets = $(e.target).find('.tweet.js-stream-tweet');
                tweets.each(function(i, element) {
                    self.processElement(element);
                });

                if(!self.waiting) {
                    self.waiting = true;
                    setTimeout(function() {
                        DTP.trace("DOMNodeInserted done!");
                        DTP.ProfileView.createTweetDTPButton();

                        self.queryDTP(self.profilesToQuery);
                        self.profilesToQuery = {};
                        self.waiting = false;
                    }, 100);
                }
            });

            $(element).on('click', '.tweet-dtp', function (event) {
                self.tweetDTP();
            });
        }

        Twitter.prototype.updateContent = function () {
            this.queryDTP(this.sessionProfiles);
        }

        return Twitter;
    }(jQuery));

})(DTP || (DTP = {}));


var settingsController = new SettingsController();
settingsController.loadSettings(function (settings) {
    var packageBuilder = new PackageBuilder(settings);
    var subjectService = new SubjectService(settings, packageBuilder);
    var trustchainService = new TrustchainService(settings);
    var twitterService = new DTP.TwitterService(settings);
    var profileRepository = new DTP.ProfileRepository(settings, localStorage);

    var twitter = new DTP.Twitter(settings, packageBuilder, subjectService, trustchainService, twitterService, profileRepository);

    // Update the content when trust changes on the Trustlist.html popup
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.command === 'updateContent') {
            twitter.updateContent();
        }
    });
    
    twitter.ready(document);
});
