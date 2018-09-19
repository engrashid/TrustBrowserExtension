 declare var tce: any;
 class SettingsController {
    settings: any
    constructor(){

        // initialize settings with default value
         this.settings = {
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
    }
    saveSettings (settings){
        if (settings.rememberme) {
            settings.keyPair = undefined;
            chrome.storage.local.set({ usersettings: settings }, () => {
                this.buildKey(settings);
                console.log('Settings saved');

            });
        }
    }

    loadSettings (cb) {
        chrome.storage.local.get('usersettings', (result) => {
            console.log('storage',result.usersettings );
            console.log('crmethod',this.settings );
            let settings = (result.usersettings) ? result.usersettings : this.settings;
            this.buildKey(settings);
            cb(settings);
        });
    }

   public buildKey(settings) {
        let keystring = settings.password + settings.seed;
        let hash = tce.bitcoin.crypto.hash256(keystring);
        let d = tce.BigInteger.fromBuffer(hash)
        
        settings.keyPair = new tce.bitcoin.ECPair(d)
        settings.address = settings.keyPair.getAddress();
        return settings.keyPair;
    }
}
export = SettingsController;