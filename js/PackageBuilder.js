var PackageBuilder = (function() {

   
    function PackageBuilder(settings) {
        this.settings = settings;

    }


    PackageBuilder.prototype.CreatePackage = function(trust) {
        var package = {
            trusts: [trust]
        }
        return package;
    }

    PackageBuilder.prototype.SignPackage = function(package) {
        for(var trustIndex in package.trusts) {
            var trust = package.trusts[trustIndex];
            this.CalculateTrustId(trust);
            this.SignTrust(trust);
        }
        return this;
    }

    PackageBuilder.prototype.CreateBinaryTrust = function(issuer, script, subject, value, note, scope, activate, expire, note)
    {
        var claim = (value !== undefined) ? { trust: value } : undefined;
            
        return this.CreateTrust(issuer, script, subject, PackageBuilder.BINARY_TRUST_DTP1, scope, JSON.stringify(claim), activate, expire, note);
    }

    PackageBuilder.prototype.CreateAliasIdentityTrust = function(issuer, script, subject, claim, scope, activate, expire, note)
    {
        return this.CreateTrust(issuer, script, subject, PackageBuilder.ALIAS_IDENTITY_DTP1, scope, JSON.stringify(claim), activate, expire, note);
    }

    PackageBuilder.prototype.CreateTrust = function(issuer, script, subject, type, scope, claim, activate, expire, note)  {
        if(typeof scope === 'string')
            scope = { value : scope };

        var trust = {
            issuer : { 
                type: script,
                address: issuer
            },
            subject : {
                address: subject
            },
            type: type,
            claim: (claim) ? claim : "",
            scope: (scope) ? scope: undefined,
            created: Math.round(Date.now()/1000.0),
            cost: 100,
            activate: (activate) ? activate: 0,
            expire: (expire) ? expire: 0,
            node: note
        }

        return trust;
    }

    PackageBuilder.prototype.SignTrust = function(trust) {
        //trust.issuer.signature = this.settings.keyPair.signCompact(id);
        trust.issuer.signature = tce.bitcoin.message.sign(this.settings.keyPair, trust.id.base64ToBuffer());
    }

    PackageBuilder.prototype.CalculateTrustId = function(trust) {
        var buf = new tce.buffer.Buffer(1024 * 256); // 256 Kb
        var offset = 0;

        if(trust.issuer) {
            if(trust.issuer.type)
                offset += buf.write(trust.issuer.type.toLowerCase(), offset);

            if(trust.issuer.address) {
                //var address = trust.issuer.address.base64ToBuffer();
                //offset += address.copy(buf, offset, 0, trust.issuer.address.length);
                offset += buf.write(trust.issuer.address, offset);

            }
        }

        if(trust.subject) {
            if(trust.subject.type)
                offset += buf.write(trust.subject.type.toLowerCase(), offset);

            if(trust.subject.address) {
                // var subjectaddress = trust.subject.address.base64ToBuffer();
                // offset += subjectaddress.copy(buf, offset, 0, trust.subject.address.length); // Bytes!
                offset += buf.write(trust.subject.address, offset);
            }
        }

        if(trust.type)
            offset += buf.write(trust.type.toLowerCase(), offset);


        if(trust.claim)
            offset += buf.write(trust.claim, offset);

        if(trust.scope) {
            if(trust.scope.type)
                offset += buf.write(trust.scope.type.toLowerCase(), offset);

            if(trust.scope.value)
                offset += buf.write(trust.scope.value, offset);
        }

        offset = buf.writeInt32LE(trust.created, offset);
        offset = buf.writeInt32LE(trust.cost, offset);
        offset = buf.writeInt32LE(trust.activate, offset);
        offset = buf.writeInt32LE(trust.expire, offset);

        var data = new tce.buffer.Buffer(offset);
        buf.copy(data, 0, 0, offset);
        trust.id = tce.bitcoin.crypto.hash256(data); 
    }

    PackageBuilder.BINARY_TRUST_DTP1 = "binary.trust.dtp1";
    PackageBuilder.CONFIRM_TRUST_DTP1 = "confirm.trust.dtp1";
    PackageBuilder.RATING_TRUST_DTP1 = "rating.trust.dtp1";
    PackageBuilder.IDENTITY_DTP1 = "identity.dtp1";
    PackageBuilder.ALIAS_IDENTITY_DTP1 = "alias.identity.dtp1";

    return PackageBuilder;
}())