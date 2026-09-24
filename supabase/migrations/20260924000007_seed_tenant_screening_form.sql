insert into public.forms (name, slug, description, fields, embed_html, form_key, is_active) values (
  'Tenant Screening',
  'tenant-screening',
  'Complete this form to start your tenant screening application.',
  '[]',
  $embed$<div id="zf_div_yf_wfCnVrT7fT6X5bKfiruez2C-cSvxsRmvyJO_aW5E">
</div>
<script type="text/javascript">
(function() {
	try{
		var f = document.createElement("iframe");
		
			var ifrmSrc = 'https://forms.zohopublic.com/getsetsold/form/TenantScreening/formperma/yf_wfCnVrT7fT6X5bKfiruez2C-cSvxsRmvyJO_aW5E?zf_rszfm=1';
		
		
        try{
			if ( typeof ZFAdvLead != "undefined" && typeof zfutm_zfAdvLead != "undefined" ) {
				for( var prmIdx = 0 ; prmIdx < ZFAdvLead.utmPNameArr.length ; prmIdx ++ ) {
				    var utmPm = ZFAdvLead.utmPNameArr[ prmIdx ];
				    utmPm = ( ZFAdvLead.isSameDomian && ( ZFAdvLead.utmcustPNameArr.indexOf(utmPm) == -1 ) ) ? "zf_" + utmPm : utmPm;
				    var utmVal = zfutm_zfAdvLead.zfautm_gC_enc( ZFAdvLead.utmPNameArr[ prmIdx ] );
				    if ( typeof utmVal !== "undefined" ) {
				      if ( utmVal != "" ) {
				        if(ifrmSrc.indexOf('?') > 0){
				             ifrmSrc = ifrmSrc+'&'+utmPm+'='+utmVal;
				        }else{
				            ifrmSrc = ifrmSrc+'?'+utmPm+'='+utmVal;
				        }
				      }
				    }
				}
			}
			if ( typeof ZFLead !== "undefined" && typeof zfutm_zfLead !== "undefined" ) {
				for( var prmIdx = 0 ; prmIdx < ZFLead.utmPNameArr.length ; prmIdx ++ ) {
		        	var utmPm = ZFLead.utmPNameArr[ prmIdx ];
		        	var utmVal = zfutm_zfLead.zfutm_gC_enc( ZFLead.utmPNameArr[ prmIdx ] );
			        if ( typeof utmVal !== "undefined" ) {
			          if ( utmVal != "" ){
			            if(ifrmSrc.indexOf('?') > 0){
			              ifrmSrc = ifrmSrc+'&'+utmPm+'='+utmVal;
			            }else{
			              ifrmSrc = ifrmSrc+'?'+utmPm+'='+utmVal;
			            }
			          }
			        }
		      	}
			}
			if (!((new RegExp("[?&]referrername=")).test(ifrmSrc))) {
            var rfr = window.location.href;
            
            try { 
                rfr = window.self !== window.top ? 
                    window.top.location.href : 
                    (/^https?:\/\/[\w.-]+\.[a-zA-Z]{2,}/i.test(rfr) ? rfr : "");
            } catch (e) {}
            
            if (rfr && rfr !== "") {
                if (rfr.length > 1800) {
                    var queryIndex = rfr.indexOf('?');
                    if (queryIndex > -1) {
                        rfr = rfr.substring(0, queryIndex);
                    }
                    if (rfr.length > 1800) {
                        rfr = rfr.substring(0, 1800);
                    }
                }
                ifrmSrc += ((ifrmSrc.indexOf('?') > 0) ? '&' : '?') + 'referrername=' + encodeURIComponent(rfr);
            }
        }
		}catch(e){}
	
		
		f.src = ifrmSrc;
		f.style.border="none";
		f.style.height="150px";
		f.style.width="99%";
		f.style.transition="all 0.5s ease";
		f.setAttribute("aria-label", 'Tenant Screening');
		
		var d = document.getElementById("zf_div_yf_wfCnVrT7fT6X5bKfiruez2C-cSvxsRmvyJO_aW5E");
		d.appendChild(f);
		window.addEventListener('message', function (){
			var evntData = event.data;
			if( evntData && evntData.constructor == String ){
				var zf_ifrm_data = evntData.split("|");
				if ( zf_ifrm_data.length == 2 || zf_ifrm_data.length == 3 ) {
					var zf_perma = zf_ifrm_data[0];
					var zf_ifrm_ht_nw = ( parseInt(zf_ifrm_data[1], 10) + 15 ) + "px";
					var iframe = document.getElementById("zf_div_yf_wfCnVrT7fT6X5bKfiruez2C-cSvxsRmvyJO_aW5E").getElementsByTagName("iframe")[0];
					if ( (iframe.src).indexOf('formperma') > 0 && (iframe.src).indexOf(zf_perma) > 0 ) {
						var prevIframeHeight = iframe.style.height;
						var zf_tout = false;
						if( zf_ifrm_data.length == 3 ) {
						    iframe.scrollIntoView();
						    zf_tout = true;
						}

						if ( prevIframeHeight != zf_ifrm_ht_nw ) {
							if( zf_tout ) {
							    setTimeout(function(){
							        iframe.style.height = zf_ifrm_ht_nw;
							    },500);
							} else {
							    iframe.style.height = zf_ifrm_ht_nw;
							}
						}
					}
				}
			}
		}, false);
    }catch(e){}
	
	
})();
</script>$embed$,
  'tenant_screening',
  true
);
