declare var Identicon: any;
declare var tce: any;
class ProfileView {
    controller: any;
    Anchor: string;
    fullNameGroup: string;
    constructor( controller: any) {
        this.controller = controller;
        //this.checkIconUrl = chrome.extension.getURL("img/check13.gif");
        this.Anchor = '.ProfileTweet-action--favorite';
        this.fullNameGroup = '.FullNameGroup';
    }

    
    renderElement (element) {
        const $element = $(element);
        let bar = $element.data('dtp_bar');
        if(!bar) {
            let $anchor = $element.find(this.Anchor);

            if($anchor.find('.trustIcon').length > 0)
                return;

            bar = {
                trust: this.createButton("Trust", "trustIconPassive", "trust", undefined),
                distrust: this.createButton("Distrust", "distrustIconPassive", "distrust", undefined),
                untrust:this.createButton("Untrust", "untrustIconPassive", "untrust", undefined)
            }

            bar.$fullNameGroup = $element.find(this.fullNameGroup);
            bar.$fullNameGroup.prepend(this.createIdenticon(this.controller.controller.profile));
           
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

        if(!this.controller.controller.profile.result)
            return;

        if (this.controller.controller.profile.result.state > 0) {
            bar.trust.$a.removeClass("trustIconPassive").addClass("trustIconActive");
            bar.trust.$span.text(this.controller.controller.profile.result.trust);

        } 

        if (this.controller.controller.profile.result.state < 0 ) {

            if(this.controller.controller.host.settings.twitterdistrust == "hidecontent") {
                bar.distrust.$a.removeClass("trustIconPassive").addClass("distrustIconActive");
                bar.distrust.$span.text(this.controller.controller.profile.result.distrust);
                $element.find('.js-tweet-text-container').hide();
                $element.find('.QuoteTweet-container').hide();
                $element.find('.AdaptiveMediaOuterContainer').hide();
            }
            if(this.controller.controller.host.settings.twitterdistrust == "automute") {
                 $element.hide(); // Hide the tweet!
            }
        }
        else {
            $element.find('.js-tweet-text-container').show();
            $element.find('.QuoteTweet-container').show();
            $element.find('.AdaptiveMediaOuterContainer').show();
        }

        if (this.controller.controller.profile.result.direct) {
            bar.untrust.$html.show();
        }
    } 

    static createTweetDTPButton() {
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
    
   static showMessage(message) {
        let pop = $('#message-drawer');
        pop.find('.message-text').text(message);
        pop.attr("style", "").removeClass('hidden').delay(3000).fadeOut(1000, function() {
            pop.addClass('hidden').attr("style", "top: -40px;");
        });
    }

    createIdenticon(profile) {
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
             opt['w'] = 800;
             opt['h'] = 800;
             var wLeft = window.screenLeft ? window.screenLeft : window.screenX;
             var wTop = window.screenTop ? window.screenTop : window.screenY;
    
             opt['left'] = Math.floor(wLeft + (window.innerWidth / 2) - (opt['w'] / 2));
             opt['top'] = Math.floor(wTop + (window.innerHeight / 2) - (opt['h'] / 2));
             
             chrome.runtime.sendMessage(opt);
             return false;
         });
        return $icon;
    }




   createButton (text, iconClass, type, count) {
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
}
export = ProfileView