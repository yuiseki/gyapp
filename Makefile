
.PHONY: gyapp-url
gyapp-url:
	gyapp https://google.com

.PHONY: gyapp-url-xpath
gyapp-url-xpath:
	gyapp https://twitter.com/yuiseki -x "//a[@href='/yuiseki/header_photo']/parent::node()"

.PHONY: gyapp-url-xpath-number
gyapp-url-xpath-number:
	gyapp https://twitter.com/yuiseki -x "//article" -n 2

.PHONY: gyapp-url-click
gyapp-url-click:
	gyapp https://twitter.com/yuiseki -c "//span[text() = 'フォロー']"

.PHONY: test
test: gyapp-url gyapp-url-xpath gyapp-url-xpath-number gyapp-url-click ;