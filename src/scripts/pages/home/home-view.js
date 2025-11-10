export default class HomeView {
  constructor() {
    this.mapContainer = null;
    this.storyListContainer = null;
  }

  getTemplate() {
    return `
      <section class="home">
        <h2 tabindex="0">🌍 Cerita di Sekitarmu</h2>
        <div id="map" style="height: 400px;"></div>
        <div id="storyList" class="story-list"></div>
      </section>
    `;
  }

  initElements() {
    this.mapContainer = document.querySelector("#map");
    this.storyListContainer = document.querySelector("#storyList");
  }

  renderStories(stories) {
    this.storyListContainer.innerHTML = "";
    stories.forEach((story) => {
      const card = document.createElement("article");
      card.classList.add("story-card");
      card.innerHTML = `
        <img src="${story.photoUrl}" alt="Foto cerita dari ${
        story.name
      }" loading="lazy"/>
        <h3>${story.name}</h3>
        <p>${story.description.substring(0, 100)}...</p>
      `;
      this.storyListContainer.appendChild(card);
    });
  }

  highlightStory(storyId, isHighlight) {
    const card = this.storyListContainer.querySelector(
      `[data-story-id="${storyId}"]`
    );
    if (card) {
      card.classList.toggle("highlight", isHighlight);
    }
  }
}
