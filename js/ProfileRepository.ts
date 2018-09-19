 /// TS_IGNORE
  ((DTP) => {
    DTP['ProfileRepository'] = (() => {
        class ProfileRepository {
            settings: any
            profiles: any
            storage: any
            constructor(settings, storage){
                this.settings = settings;
                this.profiles = {}
                this.storage = storage
                // No serializable
                // Object.defineProperty(this, 'settings', { value: settings, writable: true });
                // Object.defineProperty(this, 'storage', { value: storage, writable: false });
                // Object.defineProperty(this, 'profiles', { value: {}, writable: false });
            }
        
        // function ProfileRepository(settings, storage) { 
        //     // No serializable
        //     Object.defineProperty(this, 'settings', { value: settings, writable: true });
        //     Object.defineProperty(this, 'storage', { value: storage, writable: false });
        //     Object.defineProperty(this, 'profiles', { value: {}, writable: false });
        // }

       getCacheKey (screen_name) {
            return 'Twitter'+this.settings.address+screen_name;
        }

        getProfile(screen_name) {
            let profile = this.profiles[screen_name];
            if(profile)
                return profile;

            var data = this.storage.getItem(this.getCacheKey(screen_name));
            if(!data) {
                return null;
            } 

            profile = JSON.parse(data);
            this.setProfile(profile);
            return profile;
        }

        setProfile (profile) {
            this.profiles[profile.screen_name] = profile;
            this.storage.setItem(this.getCacheKey(profile.screen_name), JSON.stringify(profile));
        }

        ensureProfile (screen_name) {
            let profile = this.getProfile(screen_name);
            if(!profile) {
                profile = new DTP['Profile'](screen_name);
                this.setProfile(profile);
                DTP['trace']('Profile '+ profile.screen_name +' created');
            }
            return profile;
        }

        update (settings) {
            this.settings = settings;
        }
        
        //return ProfileRepository;
    }
    })();
    
})(DTP || (DTP = {} as DTP));
export = DTP;
