declare var tce: any;

class Profile {
    static Current = null;
    screen_name: string;
    alias: any;
    address: any;
    scope: string;
    constructor(screen_name) { 
        this.screen_name = screen_name;
        this.alias = screen_name;
        this.address = screen_name.hash160().toDTPAddress();
        this.scope = window.location.hostname;
    }

   static LoadCurrent(settings, profileRepository) {
        Profile.Current = JSON.parse($("#init-data")[0]['value']);
        if(settings.address) {
            Profile.Current.owner = {
                scope: '',
                address: settings.address,
                signature: tce.bitcoin.message.sign(settings.keyPair,   Profile.Current.screenName),
                valid : true
            };
        }

        let profile = profileRepository.ensureProfile(  Profile.Current.screenName);
        profile.owner =   Profile.Current.owner;
        profileRepository.setProfile(profile);
    }
}
export = Profile