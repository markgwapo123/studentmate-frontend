package com.studentmate.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowInsets;
import android.webkit.*;
import android.widget.*;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
 private static final String APP_URL="https://studentmate-frontend.vercel.app/";
 private static final int PICK_FILE=101,SAVE_BACKUP=102;
 private WebView web;
 private ProgressBar progress;
 private ValueCallback<Uri[]> fileCallback;
 private String backup;
 private boolean trusted(String url){try{Uri u=Uri.parse(url);return "https".equals(u.getScheme())&&"studentmate-frontend.vercel.app".equals(u.getHost());}catch(Exception e){return false;}}
 @Override public void onCreate(Bundle state){
  super.onCreate(state);
  LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setBackgroundColor(Color.rgb(247,245,240));
  root.setOnApplyWindowInsetsListener((v,insets)->{if(android.os.Build.VERSION.SDK_INT<30){v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;}android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars());android.graphics.Insets keyboard=insets.getInsets(WindowInsets.Type.ime());v.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,keyboard.bottom));return insets;});
  progress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);root.addView(progress,new LinearLayout.LayoutParams(-1,6));
  web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));setContentView(root);
  WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(true);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setUserAgentString(settings.getUserAgentString()+" StudentMateAndroid/1.0");
  web.addJavascriptInterface(new BackupBridge(),"StudentMateNative");
  web.setWebChromeClient(new WebChromeClient(){
   @Override public void onProgressChanged(WebView view,int value){progress.setProgress(value);progress.setVisibility(value==100?android.view.View.GONE:android.view.View.VISIBLE);}
   @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;try{Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);intent.setType("*/*");intent.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(intent,PICK_FILE);}catch(Exception e){fileCallback.onReceiveValue(null);fileCallback=null;}return true;}
  });
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){if(!request.isForMainFrame())return false;String url=request.getUrl().toString();if(trusted(url))return false;try{if("https".equals(request.getUrl().getScheme())||"mailto".equals(request.getUrl().getScheme()))startActivity(new Intent(Intent.ACTION_VIEW,request.getUrl()));}catch(Exception ignored){}return true;}
   @Override public void onPageFinished(WebView view,String url){if(!trusted(url))return;view.evaluateJavascript("if(typeof exportData==='function'){window.exportData=function(){StudentMateNative.saveBackup(JSON.stringify({format:'studentmate',version:1,data:state}));};}",null);}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())new AlertDialog.Builder(MainActivity.this).setTitle("Could not connect").setMessage("Check your internet connection and try again.").setPositiveButton("Retry",(d,w)->web.loadUrl(APP_URL)).setNegativeButton("Close",(d,w)->finish()).show();}
  });
  web.loadUrl(APP_URL);
 }
 private class BackupBridge{
  @JavascriptInterface public void saveBackup(String json){if(json==null||json.length()>10*1024*1024)return;runOnUiThread(()->{if(!trusted(web.getUrl()))return;backup=json;Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,"studentmate-backup.json");startActivityForResult(intent,SAVE_BACKUP);});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==PICK_FILE&&fileCallback!=null){Uri uri=result==RESULT_OK&&data!=null?data.getData():null;fileCallback.onReceiveValue(uri==null?null:new Uri[]{uri});fileCallback=null;}if(request==SAVE_BACKUP){if(result==RESULT_OK&&data!=null&&data.getData()!=null&&backup!=null){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out!=null)out.write(backup.getBytes(StandardCharsets.UTF_8));Toast.makeText(this,"Backup saved",Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"Could not save backup",Toast.LENGTH_SHORT).show();}}backup=null;}}
 @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else new AlertDialog.Builder(this).setTitle("Close StudentMate?").setPositiveButton("Close",(d,w)->finish()).setNegativeButton("Stay",null).show();}
 @Override protected void onDestroy(){if(fileCallback!=null)fileCallback.onReceiveValue(null);web.removeJavascriptInterface("StudentMateNative");web.destroy();super.onDestroy();}
}
