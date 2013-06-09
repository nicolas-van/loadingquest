all: css

css:
	lessc loadingquest.less loadingquest.css

zip:
	zip loadingquest.zip -r *
