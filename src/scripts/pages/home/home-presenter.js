class HomePresenter {
  constructor({ homeView, storyService }) {
    this._homeView = homeView;
    this._storyService = storyService;
    this._stories = [];
  }

  async init() {
    try {
      const stories = await this._storyService.getStories();
      this.setStories(stories);
      this._homeView.renderStories(this.getStories());
    } catch (error) {
      console.error(error);
      this._homeView.showError("Gagal memuat cerita.");
    }
  }

  setStories(stories) {
    this._stories = stories.map((story) => ({
      id: story.id,
      name: story.name,
      description: story.description,
      photoUrl: story.photoUrl,
      lat: story.lat,
      lon: story.lon,
      createdAt: story.createdAt,
    }));
  }

  getStories() {
    return this._stories;
  }

  getStoryById(id) {
    return this._stories.find((story) => story.id === id) || null;
  }

  addStory(story) {
    this._stories.push(story);
    this._homeView.renderStories(this.getStories());
  }

  updateStory(id, updatedData) {
    const index = this._stories.findIndex((s) => s.id === id);
    if (index !== -1) {
      this._stories[index] = { ...this._stories[index], ...updatedData };
      this._homeView.renderStories(this.getStories());
    }
  }

  deleteStory(id) {
    this._stories = this._stories.filter((s) => s.id !== id);
    this._homeView.renderStories(this.getStories());
  }
}
