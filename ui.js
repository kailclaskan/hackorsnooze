$(async function() {
  const $body = $('body');
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $favArticle = $("#favorited-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navWelcome = $("#nav-welcome");
  const $navUser = $("#nav-username");
  const $navLogOut = $("#nav-logout");
  const $navSub = $("#nav-sub");
  const $userInfo = $("#user-profile");

  let storyList = null;

  let currentUser = null;

  await checkIfLoggedIn();

  $loginForm.on("submit", async function(evt) {
    evt.preventDefault();

    const username = $("#login-username").val();
    const password = $("#login-password").val();

    const userInstance = await User.login(username, password);

    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  $createAccountForm.on("submit", async function(evt) {
    evt.preventDefault();

    const name = $("#create-account-name").val();
    const username = $("#create-account-username").val();
    const password = $("#create-account-password").val();

    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
  });

  $navLogOut.on("click", function() {
    localStorage.clear();
    location.reload();
  });

  $submitForm.on('submit', async function(evt){
    evt.preventDefault();
  
    const title = $('#title').val();
    const url = $('#url').val();
    const hostName = getHostName(url);
    const author = $('#author').val();
    const username = currentUser.username;
  
    const storyObject = await storyList.addStory(currentUser, {
      title,
      author,
      url,
      username
    });
  
    const $li = $(`
      <li id='${storyObject.storyId}' class='id-${storyObject.storyId}'>
        <span class='star'>
          <i class='far fa-star'></i>
        </span>
        <a class='article-link' href='${url}' target='a_blank'>
          <strong>${title}</strong>
        </a>
        <small class='article-hostname ${hostName}'>(${hostName})</small>
        <small class='article-author'>by ${author}</small>
        <small class='article-username'>posted by ${username}</small>
      </li>
    `);
    $allStoriesList.prepend($li);
    $submitForm.slideUp('slow');
    $submitForm.hide('reset');
    
  });

  $('.articles-container').on('click', '.star', async function(evt){
    if(currentUser){
      const $target = $(evt.target);
      const $closestLi = $target.closest('li');
      const $storyId = $closestLi.attr('id');
      
      if($target.hasClass('fas')){
        await currentUser.removeFav($storyId);
        $target.closest('i').toggleClass('fas far');
      }else{
        await currentUser.addFav($storyId);
        $target.closest('i').toggleClass('fas far');
      }
    }
    location.reload();
  });

  $navLogin.on("click", function() {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });
 
  $navUser.on('click', function(){
    hideElements();
    $userInfo.show();
  });

  $navSub.on('click', function(){
    if(currentUser){
      hideElements();
      $allStoriesList.show();
      $submitForm.toggle();
    }
  });

  $body.on('click', '#nav-fav', async function() {
    hideElements();
    if(currentUser){
      generateFavs();
      $favArticle.show();
    }
  });

  $body.on('click', '#nav-all', async function() {
    hideElements();
    await generateStories();
    $allStoriesList.show();
  });

  $body.on('click', '#nav-my-stories', async function() {
    hideElements();
    if(currentUser){
      $userInfo.hide();
      generateMyStories();
      $ownStories.show();
    }
  });

  $ownStories.on('click', '.trash-can', async function(evt) {
    const $closestLi = $(evt.target).closest('li');
    const $storyId = $closestLi.attr('id');

    await storyList.removeStory(currentUser, $storyId);

    await generateStories();

    hideElements();

    $allStoriesList.show();
  });

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      generateProfile();
      showNavForLoggedInUser();
    }
  }

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
    generateProfile();
  }

  function generateProfile() {
    $('#profile-name').text(`Name: ${currentUser.name}`);
    $('#profile-username').text(`Username: ${currentUser.username}`);
    $('#profile-account-date').text(`Account Created: ${currentUser.createdAt.slice(0, 10)}`);

    $navUser.text(currentUser.username);
  }

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }

  function generateStoryHTML(story, isOwnStory) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? 'fas' : 'far';
    
    const trashCanIcon = isOwnStory 
      ? `<span class="trash-can">
           <i class='far fa-trash-alt'></i>
         </span>` : '';
    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  function  generateFavs() {
    $favArticle.empty();
    
    if(currentUser.favorites.length === 0){
      $favArticle.append('<h5>No favorites added!</h5');
    }else{
      for (let story of currentUser.favorites){
        let favoriteHTML = generateStoryHTML(story, false, true);
        $favArticle.append(favoriteHTML);
      }
    }
  }

  function generateMyStories() {
    $ownStories.empty();

    if(currentUser.ownStories.length === 0){
      $ownStories.append('<h5>No stories added by user yet!</h5>');
    } else {
      for (let story of currentUser.ownStories) {
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }
    $ownStories.show();
  }

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $ownStories,
      $loginForm,
      $createAccountForm,
      $userInfo,
      $favArticle
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $userInfo.hide();
    $('.main-nav-links, #user-profile').toggleClass('hidden');
    $navWelcome.show();
    $navLogOut.show();
  }

  function isFavorite(story) {
    let favStoryIds = new Set();
    if(currentUser){
      favStoryIds = new Set(currentUser.favorites.map(obj => obj.storyId));
    }
    return favStoryIds.has(story.storyId)
  }

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if(hostName.slice(0, 4) === 'www.'){
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});