const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  static async getStories() {
    const response = await axios.get(`${BASE_URL}/stories`);

    const stories = response.data.stories.map(story => new Story(story));

    const storyList = new StoryList(stories);
    return storyList;
  }

  async addStory(user, newStory) {
    const userStory = await axios({
      method: 'POST',
      url: `${BASE_URL}/stories`,
      data: {
        token: user.loginToken,
        story: newStory,
      }
    });
    newStory = new Story(userStory.data.story);
    this.stories.unshift(newStory);
    user.ownStories.unshift(newStory);
    return newStory;
  }

  async removeStory(user, storyId){
    await axios({
      url: `${BASE_URL}/stories/${storyId}`,
      method: 'DELETE',
      data: {
        token: user.loginToken
      },
    });
    this.stories = this.stories.filter(story => story.storyId !== storyId);
    user.ownStories = user.ownStories.filter(s => s.storyId !== storyId);
  }
}

class User {
  constructor(userObj) {
    this.username = userObj.username;
    this.name = userObj.name;
    this.createdAt = userObj.createdAt;
    this.updatedAt = userObj.updatedAt;

    this.loginToken = "";
    this.favorites = [];
    this.ownStories = [];
  }

  static async create(username, password, name) {
    const response = await axios.post(`${BASE_URL}/signup`, {
      user: {
        username,
        password,
        name
      }
    });

    const newUser = new User(response.data.user);

    newUser.loginToken = response.data.token;
    return newUser;
  }

  static async login(username, password) {
    const response = await axios.post(`${BASE_URL}/login`, {
      user: {
        username,
        password
      }
    });

    const existingUser = new User(response.data.user);

    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));

    existingUser.loginToken = response.data.token;

    return existingUser;
  }


  static async getLoggedInUser(token, username) {
    if (!token || !username) return null;

    const response = await axios.get(`${BASE_URL}/users/${username}`, {
      params: {token}
    });

    const existingUser = new User(response.data.user);

    existingUser.loginToken = token;

    existingUser.favorites = response.data.user.favorites.map(s => new Story(s));
    existingUser.ownStories = response.data.user.stories.map(s => new Story(s));
    return existingUser;
  }

  async retrieveDetails(){
    const response = await axios.get(`${BASE_URL}/users/${this.username}`, {
      params: {
        token: this.loginToken
      }
    });
    
    this.name = response.data.user.name;
    this.createdAt = response.data.user.createdAt;
    this.updatedAt = response.data.user.updatedAt;

    this.favorites = response.data.user.favorites.map(s => new Story(s));
    this.ownStories = response.data.user.stories.map(s => new Story(s));

    return this;
  }

  addFav(storyId) {
    return this._toggleFav(storyId, 'POST');
  }

  removeFav(storyId) {
    return this._toggleFav(storyId, 'DELETE');
  }

  async _toggleFav(storyId, httpVerb) {
    await axios({
      url: `${BASE_URL}/users/${this.username}/favorites/${storyId}`,
      method: httpVerb,
      data: {
        token: this.loginToken
      }
    });
    await this.retrieveDetails();
    return this;
  }

  async update(userData){
    const response = await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: 'PATCH',
      data:{
        user: userData,
        token: this.loginToken
      }
    });
    this.name = response.data.user.name;

    return this;
  }

  async remove(){
    await axios({
      url: `${BASE_URL}/users/${this.username}`,
      method: 'DELETE',
      data:{
        token: this.loginToken
      }
    });
  }
}
class Story {

  constructor(storyObj) {
    this.author = storyObj.author;
    this.title = storyObj.title;
    this.url = storyObj.url;
    this.username = storyObj.username;
    this.storyId = storyObj.storyId;
    this.createdAt = storyObj.createdAt;
    this.updatedAt = storyObj.updatedAt;
  }
  async update(user, storyData) {
    const response = await axios({
      url: `${BASE_URL}/stories/${this.storyId}`,
      method: 'PATCH',
      data: {
        token: user.loginToken,
        story: storyData
      }
    });

    const { author, title, url, updatedAt } = response.data.story;

    this.author = author;
    this.title = title;
    this.url = url;
    this.updatedAt = updatedAt;

    return this;
  }
}