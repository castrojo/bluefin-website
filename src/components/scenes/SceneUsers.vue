<script setup lang='ts'>
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import { LangUsersListItems, LangUsersTag, LangUsersText, LangUsersTitle } from '../../content'
</script>

<template>
  <section id="scene-users" class="section-wrap">
    <div class="container">
      <div class="img-wrap">
        <img src="/characters/bluefin-small.png" alt="Character bluefin artwork">
      </div>

      <div>
        <SceneContent :tag="LangUsersTag" :title="LangUsersTitle" :text="LangUsersText" />
        <!-- <ul>
          <li v-for="item in LangUsersListItems" :key="item">
            {{ item }}
          </li>
        </ul> -->

        <div class="brand-grid">
          <div v-for="item in LangUsersListItems" :key="item" class="brand-item">
            <p>{{ item }}</p>
          </div>
        </div>
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-users" />
  </section>
</template>
