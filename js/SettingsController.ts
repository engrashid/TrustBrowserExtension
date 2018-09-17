//  declare var tce: any;
//  var SettingsController = function() {
//     function SettingsController()
//     {
//         var self = this;
//         this.createSettings = function() {
//             var settings = {
//                 "password": '',
//                 "seed": '',
//                 "rememberme": true,
//                 "infoserver": "https://trust.dance",
//                 // "buildserver": "https://trust.dance:12701",
//                 // "graphserver": "https://trust.dance:12702",
//                 'trustrender': 'icon',
//                 "resultrender": 'warning'
//                 //"keypair": null
//             }
//             return settings;
//         }
    
//         this.saveSettings = function(settings) {
//             if (settings.rememberme) {
//                 settings.keyPair = undefined;
//                 chrome.storage.local.set({ usersettings: settings }, function () {
//                     this.buildKey(settings);
//                     console.log('Settings saved');

//                 });
//             }
//         }
    
//         this.loadSettings = function (cb) {
//             chrome.storage.local.get('usersettings', function (result) {
//                 var settings = (result.usersettings) ? result.usersettings : self.createSettings();
//                 self.buildKey(settings);
//                 cb(settings);
//             });
//         }
    
//         this.buildKey = function (settings) {
//             var keystring = settings.password + settings.seed;
//             var hash = tce.bitcoin.crypto.hash256(keystring);
//             var d = tce.BigInteger.fromBuffer(hash)
            
//             settings.keyPair = new tce.bitcoin.ECPair(d)
//             settings.address = settings.keyPair.getAddress();
//             return settings.keyPair;
//         }
//     }

//     return SettingsController;
// }
// export = SettingsController;
 //module.exports = { SettingsController}
 declare var tce: any;

 class SettingsController {

    constructor(){
        //this.loadSettings = this.loadSettings.bind(this);
        //this.createSettings();
       // const self = this;
    }
    createSettings = (): any => {
        var settings = {
            "password": '',
            "seed": '',
            "rememberme": true,
            "infoserver": "https://trust.dance",
            // "buildserver": "https://trust.dance:12701",
            // "graphserver": "https://trust.dance:12702",
            'trustrender': 'icon',
            "resultrender": 'warning'
            //"keypair": null
        }
        return settings;
    }

    saveSettings = (settings): any => {
        if (settings.rememberme) {
            settings.keyPair = undefined;
            chrome.storage.local.set({ usersettings: settings }, function () {
                this.buildKey(settings);
                console.log('Settings saved');

            });
        }
    }

    loadSettings = (cb): any => {
        console.log('ts settings working')
        chrome.storage.local.get('usersettings', (result) => {
            var settings = (result.usersettings) ? result.usersettings : this.createSettings;
            this.buildKey(settings);
            cb(settings);
        });
    }

   public buildKey = (settings): any => {
        var keystring = settings.password + settings.seed;
        var hash = tce.bitcoin.crypto.hash256(keystring);
        var d = tce.BigInteger.fromBuffer(hash)
        
        settings.keyPair = new tce.bitcoin.ECPair(d)
        settings.address = settings.keyPair.getAddress();
        return settings.keyPair;
    }
}
export = SettingsController;