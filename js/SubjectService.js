///<reference path="../typings/globals/jquery/index.d.ts" />

var SubjectService = (function() {
    function SubjectService(settings, packageBuilder) {
        this.SCRIPT = "btc-pkh";
        this.settings = settings;
        this.packageBuilder = packageBuilder;
    }

    SubjectService.ensureSubject = function(author) {
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

    SubjectService.enrichSubject = function(author, comment) {

        let subject = this.ensureSubject(author);

        let $proof = $(comment).find("a[href*='scope=reddit']:contains('Proof')")
        if ($proof.length > 0) {
            var params = getQueryParams($proof.attr("href"));
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


    SubjectService.prototype.BuildBinaryTrust = function(profile, value, note, expire) {
        var trust = this.packageBuilder.CreateBinaryTrust(
            this.settings.address, 
            this.SCRIPT, 
            profile.address, 
            value, 
            note,
            profile.scope,
            0,
            expire);

        var package = this.packageBuilder.CreatePackage(trust);

        if(profile.owner && profile.owner.address) {
            var ownerTrust = this.packageBuilder.CreateBinaryTrust(
                this.settings.address, 
                this.SCRIPT, 
                profile.owner.address, 
                value, 
                note,
                "", // Do not use scope on global identity
                0,
                expire);
            package.trusts.push(ownerTrust);

            if(!isNullOrWhitespace(profile.alias)) { 
                var aliastrust = this.packageBuilder.CreateAliasIdentityTrust(
                    this.settings.address,
                    this.SCRIPT, 
                    profile.owner.address,
                    { alias: profile.alias },
                    profile.scope,
                    0,
                    expire);

                package.trusts.push(aliastrust);
    
            }
        }
        return package;
    }

    SubjectService.subjects = [];

    return SubjectService;
}())


