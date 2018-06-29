///<reference path="../typings/globals/jquery/index.d.ts" />

var TrustHandler = (function() {
    function TrustHandler(package, settings) {
        if(!package) 
            package = { trusts: [] };

        this.settings = settings;
        this.package = package;
        this.subjects = [];
        this.alias = [];
    }

    TrustHandler.prototype.BuildSubjects = function() {
        if(!this.package.trusts)
            return;

        for(var trustIndex in this.package.trusts)
        {
            var trust = this.package.trusts[trustIndex];
            trust.claimObj = JSON.parse(trust.claim);

            if(trust.type === PackageBuilder.BINARY_TRUST_DTP1) {
                var list = this.subjects[trust.subject.address];

                if(!list) {
                    list = [];
                    this.subjects[trust.subject.address] = list;
                } 

                list.push(trust);
            }

            if(trust.type === PackageBuilder.ALIAS_IDENTITY_DTP1) {
                var list = this.alias[trust.subject.address];

                if(!list) {
                    list = [];
                    this.alias[trust.subject.address] = list;
                } 

                list.push(trust);
            }

        }
    }


    TrustHandler.prototype.CalculateBinaryTrust = function(subjectAddress, ownerAddress) {
        var self = this;
        var result = {
            direct : false,
            directValue: undefined,
            trust : 0,
            distrust: 0,
        };

        var binaryTrustCount = 0;
        
        var subjectTrusts = self.subjects[subjectAddress];
        var ownerTrusts = self.subjects[ownerAddress];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts) {
            if(!trusts) return;
            for(var i in trusts) {
                var trust = subjectTrusts[i];
                if(trust.type === PackageBuilder.BINARY_TRUST_DTP1) {
                    binaryTrustCount ++;

                    if(trust.claimObj.trust === true) 
                        result.trust++;
                    else
                        result.distrust++;
                                    // IssuerAddress is base64
                    if(trust.issuer.address == self.settings.address)
                    {
                        result.direct = true;
                        result.directValue = trust.claimObj.trust;
                    }
                }
            }
        }
        CalcTrust(ownerTrusts);
        //if(result.trust == 0 && result.distrust == 0)
        CalcTrust(subjectTrusts);   

        //result.trustPercent = Math.floor((result.isTrusted * 100) / binaryTrustCount);
        result.state = result.trust - result.distrust;

        return result;
    }

    TrustHandler.prototype.CalculateBinaryTrust2 = function(subjectAddress, ownerAddress) {
        var self = this;
        var result = {
            networkScore : 0,
            personalScore: 0,
        };
        //var binaryTrustCount = 0;
        
        var subjectTrusts = self.subjects[subjectAddress];
        var ownerTrusts = self.subjects[ownerAddress];
        if(!subjectTrusts && !ownerTrusts)
            return result;

        function CalcTrust(trusts) {
            if(!trusts) return;
            for(const key in trusts) {
                const trust = trusts[key];

                if(trust.type != PackageBuilder.BINARY_TRUST_DTP1)
                    continue;

                //binaryTrustCount ++;

                if(trust.issuer.address == self.settings.address) { // Its your trust!
                    result.personalScore += (trust.claimObj.trust) ? 1 : -1;
                } else {
                    result.networkScore += (trust.claimObj.trust) ? 1 : -1;
                }
            }
        }
        CalcTrust(subjectTrusts);   
        CalcTrust(ownerTrusts);
        
        if (result.personalScore != 0) {
            result.networkScore = result.personalScore;
        }

        //result.trustPercent = Math.floor((result.networkScore * 100) / binaryTrustCount);

        return result;
    }

    return TrustHandler;
}());