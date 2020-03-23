<?php 

function getMetaData(){
    $projectId = $_REQUEST['project_id'];
    $api = "https://admin.systeme-frigg.org/api/project-summary/$projectId";
    $data = json_decode(file_get_contents($api));

    if (!$data || ! isset($data->first_scene) || ! isset($data->first_scene->meta)){
        return null;
    }

    return $data->first_scene->meta;
}

function buildMetaTags($meta){

    if (!$meta) {
        return null;
    }

    $selfUrl = "{$_SERVER['REQUEST_SCHEME']}://{$_SERVER['HTTP_HOST']}{$_SERVER['REQUEST_URI']}";
    $projectId = $_REQUEST['project_id'];

    $html = [];
    $html[] = "<!-- FRIGG DYNAMIC META : START -->";

    //standard
    if (isset($meta->title)) $html[] = "<title>{$meta->title}</title>";
    if (isset($meta->description)) $html[] = "<meta name='description' content='{$meta->description}' />";

    //fb
    $html[] = "<meta property='og:url' content='{$selfUrl}' />";
    $html[] = "<meta property='og:type' content='website' />";
    if (isset($meta->title)) $html[] = "<meta property='og:title' content='{$meta->title}' />";
    if (isset($meta->description)) $html[] = "<meta property='og:description' content='{$meta->description}' />";
    if (isset($meta->illustration)) $html[] = "<meta property='og:image' content='{$meta->illustration}' />";

    //frigg 
    $html[] = "<meta property='frigg:project' content='{$projectId}' />";
    if (isset($meta->google_analytics_account)) $html[] = "<meta property='frigg:google_analytics_account' content='{$meta->google_analytics_account}' />";
    if (isset($meta->facebook_account)) $html[] = "<meta property='frigg:facebook_account' content='{$meta->facebook_account}' />";

    $html[] = "<!-- FRIGG DYNAMIC META : END -->";

    return $html;
}

function getBasePage(){
    $page = file_get_contents('index.htm');
    return $page;
}


function generateFinalPage(){
    $metaHtml = buildMetaTags(getMetaData());
    $page = getBasePage();

    if (! $metaHtml) {
        return $page;
    }

    $placeholder = "<!-- FRIGG DYNAMIC META -->";
    $finalPage = str_replace($placeholder, implode("\n", $metaHtml), $page);

    return $finalPage;
}


print( generateFinalPage() );

