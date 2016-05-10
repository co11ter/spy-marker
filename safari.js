window.onload=function(){
    if(navigator.userAgent.indexOf('Safari')!=-1&&navigator.userAgent.indexOf('Chrome')==-1){
        var cookies=document.cookie;
        if(top.location!=document.location){
            if(!cookies){
                href=document.location.href;
                href=(href.indexOf('?')==-1)?href+'?':href+'&';
                top.location.href = href+'reref='+encodeURIComponent(document.referrer);
            }
        } else {
            ts=new Date().getTime();document.cookie='ts='+ts;
            rerefidx=document.location.href.indexOf('reref=');
            if(rerefidx!=-1){
                href=decodeURIComponent(document.location.href.substr(rerefidx+6));
                window.location.replace(href);
            }
        }
    }
};
