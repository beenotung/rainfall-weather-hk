# %% import tensorflow library

import tensorflow as tf

tf.__version__

# %% load the model from file

model = tf.keras.models.load_model('model.tf')

model.summary()

# %% test the model

## month, day, hour, minute
sample_input = [7,31,13,30]

[[sample_output]] = model.predict([sample_input])

## rainfall_amount
sample_output

# %%
