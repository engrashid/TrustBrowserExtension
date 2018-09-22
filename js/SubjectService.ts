///<reference path="../typings/globals/jquery/index.d.ts" />
declare var tce: any;
class SubjectService  {
    SCRIPT: string;
    settings: any;
    packageBuilder: any;
    subjects = [];
    constructor(settings, packageBuilder) {
        this.SCRIPT = "btc-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    ensureSubject (author) {
        let subject = this.subjects[author];
        if (!subject) {
            subject = {
                author: author,
                address:author.hash160(),
                scope: window.location.hostname,
                type: "person",
            };
            this.subjects[author]= subject;
        }
        return subject;
    }

   enrichSubject (author, comment) {

        let subject = this.ensureSubject(author);

        let $proof = $(comment).find("a[href*='scope=reddit']:contains('Proof')")
        if ($proof.length > 0) {
            let params = getQueryParams($proof.attr("href"));
            if(params.name == author) {
                if(!subject.owner)
                    subject.owner = params;
                
                subject.owner.author = author;

                if(typeof subject.owner.address === 'string') {
                    subject.owner.address = new tce.buffer.Buffer(subject.owner.address, 'HEX');
                }
            }
        }
        return subject;
    }


    BuildBinaryTrust (profile, value, note, expire) {
        let trust = undefined;
        if(profile.address) {
            trust = this.packageBuilder.CreateBinaryTrust(
            this.settings.address, 
            this.SCRIPT, 
            profile.address, 
            value, 
            note,
            profile.scope,
            0,
            expire);
        }
        
        let trustpackage = this.packageBuilder.CreatePackage(trust);

        if(profile.owner && profile.owner.address) {
            let ownerTrust = this.packageBuilder.CreateBinaryTrust(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.address, 
                value, 
                note,
                "", // Do not use scope on global identity
                0,
                expire);
                trustpackage.trusts.push(ownerTrust);

            if(!isNullOrWhitespace(profile.alias)) { 
                let aliastrust = this.packageBuilder.CreateAliasIdentityTrust(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.address,
                    { alias: profile.alias },
                    profile.scope,
                    0,
                    expire);

                    trustpackage.trusts.push(aliastrust);
            }
        }
        return trustpackage;
    }
}
export = SubjectService

