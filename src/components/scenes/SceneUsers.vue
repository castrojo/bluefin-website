<script setup lang='ts'>
import { ref } from 'vue'
import SceneContent from '../common/SceneContent.vue'
import SceneVisibilityChecker from '../common/SceneVisibilityChecker.vue'
import { LangUsersAppendix, LangUsersListItems, LangUsersTag, LangUsersText, LangUsersTitle } from '../../content'

const vis = ref(false)
</script>

<template>
  <section id="scene-users" class="section-wrap">
    <div class="container">
      <Transition name="fade">
        <div v-if="vis" class="img-wrap">
          <img src="/characters/bluefin-small.png" alt="Character bluefin artwork">
        </div>
      </Transition>

      <div>
        <SceneContent :tag="LangUsersTag" :title="LangUsersTitle" :text="LangUsersText" @visible="vis = true">
          <div class="brand-grid">
            <div v-for="item in LangUsersListItems" :key="item" class="brand-item">
              <p>{{ item }}</p>
            </div>
          </div>

          <p v-if="LangUsersAppendix">
            {{ LangUsersAppendix }}
          </p>
        </SceneContent>
      </div>
    </div>
    <SceneVisibilityChecker name="#scene-users" />
  </section>
</template>
