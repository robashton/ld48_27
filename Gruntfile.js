module.exports = function(grunt) {
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      'public/javascripts/app.js': [ 'client.js' ]
    },
    watch: {
      scripts: {
        files: [ "client.js"],
        tasks: [ 'browserify' ]
      },
    }
  })

  grunt.registerTask('develop', ['watch'])
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-browserify')
}
