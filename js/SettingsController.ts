 declare var tce: any;
 class SettingsController {

    constructor(){
        //this.loadSettings = this.loadSettings.bind(this);
        //this.createSettings();
       // const self = this;
    }
    createSettings = (): any => {
        const settings = {
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
            let settings = (result.usersettings) ? result.usersettings : this.createSettings;
            this.buildKey(settings);
            cb(settings);
        });
    }

   public buildKey = (settings): any => {
        let keystring = settings.password + settings.seed;
        let hash = tce.bitcoin.crypto.hash256(keystring);
        let d = tce.BigInteger.fromBuffer(hash)
        
        settings.keyPair = new tce.bitcoin.ECPair(d)
        settings.address = settings.keyPair.getAddress();
        return settings.keyPair;
    }
}
export = SettingsController;